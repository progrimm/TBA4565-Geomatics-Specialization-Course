import './App.css'
import { geoGraticule10, geoMercatorRaw, geoPath, geoCircle, geoProjection } from 'd3-geo'
import { geoEckert4Raw } from 'd3-geo-projection'
import { useEffect, useState } from 'react'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'

const width = 1000
const height = 650
const padding = 16
const graticule = geoGraticule10()

const circleGenerator = geoCircle().radius(3).precision(2)
const latitudes = [-60, -30, 0, 30, 60]
const longitudes = [-150, -90, -30, 30, 90, 150]

const distortionCircles = latitudes.flatMap(latitude =>
  longitudes.map(longitude => ({
    id: `${longitude},${latitude}`,
    geometry: circleGenerator.center([longitude, latitude])(),
  })),
)

function projectBlend(
  longitude: number,
  latitude: number,
  amount: number,
): [number, number] {
  const eckertPoint = geoEckert4Raw(longitude, latitude)

  if (amount === 1) return eckertPoint

  const latitudeLimit = Math.atan(Math.sinh(Math.PI))
  const mercatorLatitude = Math.max(
    -latitudeLimit,
    Math.min(latitudeLimit, latitude),
  )

  const mercatorPoint = geoMercatorRaw(longitude, mercatorLatitude)

  return [
    (1 - amount) * mercatorPoint[0] + amount * eckertPoint[0],
    (1 - amount) * mercatorPoint[1] + amount * eckertPoint[1],
  ]
}

function createMorphProjection(amount: number) {
  return geoProjection((longitude, latitude) =>
    projectBlend(longitude, latitude, amount),
  ).fitExtent(
    [[padding, padding], [width - padding, height - padding]],
    { type: 'Sphere' },
  )
}

function App() {
  const [countries, setCountries] =
    useState<FeatureCollection<Polygon | MultiPolygon> | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showDistortion, setShowDistortion] = useState<boolean>(true)
  const [morphAmount, setMorphAmount] = useState<number>(1)

  const morphProjection = createMorphProjection(morphAmount)
  const morphPath = geoPath(morphProjection)
  const morphGridPath = morphPath(graticule)
  const morphOutlinePath = morphPath({ type: 'Sphere' })
  const morphCountriesPath = countries ? morphPath(countries) : null

  useEffect(() => {
    let ignore = false

    async function loadCountries() {
      try {
        const response = await fetch('/data/ne_110m_admin_0_countries.geojson')

        if (!response.ok) {
          throw new Error(`Country request failed: HTTP ${response.status}`)
        }

        const data: FeatureCollection<Polygon | MultiPolygon> =
          await response.json()

        if (!ignore) {
          setCountries(data)
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(error instanceof Error ? error.message : 'Loading failed')
        }
      }
    }

    void loadCountries()

    return () => {
      ignore = true
    }
  }, [])

  const projectionName = morphAmount === 0
    ? 'Mercator'
    : morphAmount === 1
      ? 'Eckert IV'
      : 'Mercator / Eckert IV blend'

  return (
    <main>
      <header className="page-intro">
        <p className="eyebrow">Projection study / 01</p>
        <h1>One Earth, different proportions.</h1>
        <p className="introduction">
          A flat map cannot preserve every property of a globe. Mercator preserves
          local angles but enlarges high latitudes; Eckert IV preserves relative
          area but changes shapes. Greenland and Africa make that trade-off visible.
        </p>
      </header>
      <section className="map-study" aria-labelledby="projection-title">
        <div className="map-toolbar">
          <div className="projection-heading">
            <p className="eyebrow">Current projection</p>
            <h2 id="projection-title">{projectionName}</h2>
          </div>
          <div className="blend-control">
            <div className="control-heading">
              <label htmlFor="projection-blend">Projection blend</label>
              <output htmlFor="projection-blend">{Math.round(morphAmount * 100)}%</output>
            </div>
            <input
              id="projection-blend"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={morphAmount}
              onChange={event => setMorphAmount(event.currentTarget.valueAsNumber)}
              aria-valuetext={morphAmount === 0
                ? 'Mercator, polar-capped'
                : morphAmount === 1
                  ? 'Eckert IV'
                  : `${Math.round(morphAmount * 100)}% toward Eckert IV`}
            />
            <div className="range-endpoints" aria-hidden="true">
              <span>Mercator</span><span>Eckert IV</span>
            </div>
          </div>
          <label className="overlay-control">
            <input
              type="checkbox"
              checked={showDistortion}
              onChange={event => setShowDistortion(event.currentTarget.checked)}
            />
            Distortion circles
          </label>
        </div>
        <figure className="map-figure">
          <svg
            className="world-map"
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            role="img"
            aria-label={`${projectionName} world map${showDistortion ? ' with distortion circles' : ''}`}
          >
            <path className="ocean" d={morphOutlinePath ?? undefined} />
            <path
              className="countries"
              d={morphCountriesPath ?? undefined}
            />
            <path
              className="graticule"
              d={morphGridPath ?? undefined}
            />
            {showDistortion && distortionCircles.map(circle => (
              <path
                key={circle.id}
                className="distortion-circle"
                d={morphPath(circle.geometry) ?? undefined}
              />
            ))}
          </svg>
          <figcaption>
            <p className="data-status" role="status">
              {loadError ?? (countries
                ? `Natural Earth / 1:110m / ${countries.features.length} features`
                : 'Loading countries...')}
            </p>
            <span className="circle-legend">Equal-radius circles on the sphere</span>
          </figcaption>
        </figure>
      </section>
      <section className="projection-notes" aria-label="Understanding projection distortion">
        <article>
          <p className="eyebrow">01 / Angles</p>
          <h2>Mercator</h2>
          <p>Local angles are preserved, making small shapes recognizable. Area
            grows increasingly exaggerated toward the poles: Greenland appears
            much larger relative to Africa than it really is.</p>
        </article>
        <article>
          <p className="eyebrow">02 / Area</p>
          <h2>Eckert IV</h2>
          <p>Equal areas on the sphere occupy equal areas on the map. Africa is
            roughly fourteen times Greenland's area. That proportion is retained,
            while angles and shapes are distorted.</p>
        </article>
        <article>
          <p className="eyebrow">03 / Distortion</p>
          <h2>From circles to ellipses</h2>
          <p>Tissot's indicatrix describes the deformation of an infinitesimal
            circle. These finite circles approximate that idea: changes in size
            indicate area distortion; stretching reveals shape distortion.</p>
        </article>
      </section>
      <footer className="study-footer">
        <p>The blend is a visual interpolation, not a calibrated distortion measure.
          Intermediate maps generally preserve neither angles nor area. The Mercator
          contribution is capped at approximately 85.05 degrees latitude, and the
          map is refitted at each step; absolute screen size is not a common scale.</p>
        <a href="https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/">Natural Earth data source</a>
      </footer>
    </main>
  )
}

export default App
