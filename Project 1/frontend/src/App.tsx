import './App.css'
import {
  geoGraticule10,
  geoMercatorRaw,
  geoPath,
  geoCircle,
  geoProjection,
} from 'd3-geo'
import { geoEckert4Raw } from 'd3-geo-projection'
import { useEffect, useState } from 'react'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'

const width = 1000
const height = 650
const padding = 16
const graticule = geoGraticule10()

type ProjectionArea = {
  area_m2: number
  area_ratio: number
}
type GreenlandAreas = {
  country_code: string
  spherical_reference_area_m2: number
  ellipsoidal_area_m2: number
  projections: { merc: ProjectionArea; eck4: ProjectionArea }
}

const areaFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const ratioFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })
const formatArea = (area: number) => `${areaFormat.format(area / 1e6)} km²`
const projections = [
  { key: 'merc', name: 'Mercator', amount: 0 },
  { key: 'eck4', name: 'Eckert IV', amount: 1 },
] as const

async function fetchJson<ResponseData>(
  url: string,
  label: string,
): Promise<ResponseData> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`)
  }
  return response.json()
}

function validateAreas(data: GreenlandAreas) {
  const values = [
    data?.spherical_reference_area_m2,
    data?.ellipsoidal_area_m2,
    data?.projections?.merc?.area_m2,
    data?.projections?.merc?.area_ratio,
    data?.projections?.eck4?.area_m2,
    data?.projections?.eck4?.area_ratio,
  ]
  if (
    data?.country_code !== 'GRL' ||
    !values.every((value) => Number.isFinite(value) && value > 0)
  ) {
    throw new Error('Greenland statistics are invalid')
  }
  return data
}

const circleGenerator = geoCircle().radius(3).precision(2)
const latitudes = [-60, -30, 0, 30, 60]
const longitudes = [-150, -90, -30, 30, 90, 150]

const distortionCircles = latitudes.flatMap((latitude) =>
  longitudes.map((longitude) => ({
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
    [
      [padding, padding],
      [width - padding, height - padding],
    ],
    { type: 'Sphere' },
  )
}

function App() {
  const [countries, setCountries] = useState<FeatureCollection<
    Polygon | MultiPolygon
  > | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showDistortion, setShowDistortion] = useState<boolean>(true)
  const [morphAmount, setMorphAmount] = useState<number>(1)
  const [greenlandAreas, setGreenlandAreas] = useState<GreenlandAreas | null>(
    null,
  )
  const [areaError, setAreaError] = useState<string | null>(null)

  const morphProjection = createMorphProjection(morphAmount)
  const morphPath = geoPath(morphProjection)
  const morphGridPath = morphPath(graticule)
  const morphOutlinePath = morphPath({ type: 'Sphere' })
  const morphCountriesPath = countries ? morphPath(countries) : null
  const greenland = countries?.features.find(
    (feature) => feature.properties?.adm0_a3 === 'GRL',
  )
  const greenlandPath = greenland ? morphPath(greenland) : null

  useEffect(() => {
    let ignore = false
    async function loadAreas() {
      try {
        const data = await fetchJson<GreenlandAreas>(
          '/api/countries/GRL/areas',
          'Greenland request failed',
        )
        const areas = validateAreas(data)
        if (!ignore) setGreenlandAreas(areas)
      } catch (error) {
        if (!ignore)
          setAreaError(
            error instanceof Error ? error.message : 'Statistics unavailable',
          )
      }
    }
    void loadAreas()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadCountries() {
      try {
        const data = await fetchJson<FeatureCollection<Polygon | MultiPolygon>>(
          '/api/countries',
          'Country request failed',
        )

        if (!ignore) {
          setCountries(data)
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(
            error instanceof Error ? error.message : 'Loading failed',
          )
        }
      }
    }

    void loadCountries()

    return () => {
      ignore = true
    }
  }, [])

  const projectionName =
    morphAmount === 0 ? 'Mercator' : morphAmount === 1 ? 'Eckert IV' : 'Blend'

  return (
    <main>
      <header className="app-header">
        <h1>
          Projection <span>Lab</span>
        </h1>
        <span className="header-note">Mercator / Eckert IV</span>
      </header>
      <section className="map-study" aria-labelledby="projection-title">
        <div className="map-toolbar">
          <div className="projection-heading">
            <h2 id="projection-title">{projectionName}</h2>
          </div>
          <div className="blend-control">
            <div className="control-heading">
              <label htmlFor="projection-blend">Blend</label>
              <output htmlFor="projection-blend">
                {Math.round(morphAmount * 100)}%
              </output>
            </div>
            <input
              id="projection-blend"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={morphAmount}
              onChange={(event) =>
                setMorphAmount(event.currentTarget.valueAsNumber)
              }
              aria-valuetext={
                morphAmount === 0
                  ? 'Mercator, polar-capped'
                  : morphAmount === 1
                    ? 'Eckert IV'
                    : `${Math.round(morphAmount * 100)}% toward Eckert IV`
              }
            />
            <div className="range-endpoints" aria-hidden="true">
              <span>Mercator</span>
              <span>Eckert IV</span>
            </div>
          </div>
          <label className="overlay-control">
            <input
              type="checkbox"
              checked={showDistortion}
              onChange={(event) =>
                setShowDistortion(event.currentTarget.checked)
              }
            />
            Circles
          </label>
        </div>
        <div className="map-content">
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
              <path className="countries" d={morphCountriesPath ?? undefined} />
              <path className="greenland" d={greenlandPath ?? undefined}>
                <title>Greenland</title>
              </path>
              <path className="graticule" d={morphGridPath ?? undefined} />
              {showDistortion &&
                distortionCircles.map((circle) => (
                  <path
                    key={circle.id}
                    className="distortion-circle"
                    d={morphPath(circle.geometry) ?? undefined}
                  />
                ))}
            </svg>
            <figcaption>
              <p className="data-status" role="status">
                {loadError ??
                  (countries
                    ? `${countries.features.length} countries`
                    : 'Loading map...')}
              </p>
              <span className="circle-legend">3° circles</span>
            </figcaption>
          </figure>
          <aside className="greenland-study" aria-labelledby="greenland-title">
            <h2 id="greenland-title">Greenland</h2>
            <p className="area-context" aria-live="polite">
              {morphAmount === 0
                ? 'Mercator'
                : morphAmount === 1
                  ? 'Eckert IV'
                  : 'Blend area not calculated'}
            </p>
            {areaError ? (
              <p role="alert">{areaError}</p>
            ) : !greenlandAreas ? (
              <p role="status">Loading Greenland areas...</p>
            ) : (
              <>
                <dl className="reference-areas">
                  <div>
                    <dt>WGS 84 ellipsoid</dt>
                    <dd>{formatArea(greenlandAreas.ellipsoidal_area_m2)}</dd>
                  </div>
                  <div>
                    <dt>Sphere · reference</dt>
                    <dd>
                      {formatArea(greenlandAreas.spherical_reference_area_m2)}
                    </dd>
                  </div>
                </dl>
                <table className="area-table">
                  <caption>Projected area / spherical area</caption>
                  <thead>
                    <tr>
                      <th scope="col">Projection</th>
                      <th scope="col">Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projections.map(({ key, name, amount }) => {
                      const active = morphAmount === amount
                      const result = greenlandAreas.projections[key]
                      return (
                        <tr
                          key={key}
                          className={active ? 'active-projection' : undefined}
                        >
                          <th
                            scope="row"
                            aria-current={active ? 'true' : undefined}
                          >
                            {name}
                            <span className="projected-area">
                              {formatArea(result.area_m2)}
                            </span>
                          </th>
                          <td>{ratioFormat.format(result.area_ratio)}×</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p className="area-note">Endpoint values, not screen areas.</p>
              </>
            )}
          </aside>
        </div>
      </section>
      <footer className="study-footer">
        <details className="method-notes">
          <summary>Method</summary>
          <p>
            Mercator preserves local angles; Eckert IV preserves spherical area.
            Ratios use a sphere, not the WGS 84 ellipsoid. A ratio of 1 means
            equal area.
          </p>
          <p>
            Blends have no calculated area and generally preserve neither angles
            nor area. Each view is fitted independently. Mercator latitude is
            capped at ±85.05°.
          </p>
          <p>
            The 3° circles approximate Tissot's indicatrix. Boundaries are
            generalized, not authoritative national measurements.
          </p>
        </details>
        <a href="https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/">
          Natural Earth · 1:110m
        </a>
      </footer>
    </main>
  )
}

export default App
