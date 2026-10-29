import './App.css'
import {
  geoGraticule10,
  geoMercatorRaw,
  geoPath,
  geoCircle,
  geoProjection,
} from 'd3-geo'
import { geoEckert4Raw } from 'd3-geo-projection'
import { useEffect, useMemo, useState } from 'react'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import DistortionChart from './DistortionChart'
import { fetchJson, validateAreas, type CountryAreas } from './countryAreas'
import { countriesUrl, countryAreasUrl, isStatic } from './dataSource'

const width = 1000
const height = 650
const padding = 16
const graticule = geoGraticule10()

const areaFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const ratioFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })
const percentFormat = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
})
const formatArea = (area: number) => `${areaFormat.format(area / 1e6)} km²`
const formatLatitude = (latitude: number) =>
  `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'}`
const projections = [
  { key: 'merc', name: 'Mercator', amount: 0 },
  { key: 'eck4', name: 'Eckert IV', amount: 1 },
] as const

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

type Countries = FeatureCollection<Polygon | MultiPolygon>
const countryCode = (feature: Countries['features'][number]): string =>
  feature.properties?.adm0_a3 ?? ''

function App() {
  const [countries, setCountries] = useState<Countries | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showDistortion, setShowDistortion] = useState<boolean>(true)
  const [morphAmount, setMorphAmount] = useState<number>(1)
  const [countryAreas, setCountryAreas] = useState<Map<
    string,
    CountryAreas
  > | null>(null)
  const [areaError, setAreaError] = useState<string | null>(null)
  const [selectedCode, setSelectedCode] = useState<string>('GRL')

  const morphPath = useMemo(
    () => geoPath(createMorphProjection(morphAmount)),
    [morphAmount],
  )
  const countryPaths = useMemo(
    () =>
      countries?.features.map((feature) => ({
        code: countryCode(feature),
        name: String(feature.properties?.admin ?? countryCode(feature)),
        d: morphPath(feature) ?? undefined,
      })) ?? [],
    [countries, morphPath],
  )
  const morphGridPath = morphPath(graticule)
  const morphOutlinePath = morphPath({ type: 'Sphere' })
  const selectedPath = countryPaths.find(({ code }) => code === selectedCode)
  const selectedAreas = countryAreas?.get(selectedCode)
  const selectedName =
    selectedAreas?.admin ?? selectedPath?.name ?? selectedCode
  const areaList = useMemo(
    () =>
      countryAreas
        ? [...countryAreas.values()].sort((a, b) =>
            a.admin.localeCompare(b.admin),
          )
        : [],
    [countryAreas],
  )

  useEffect(() => {
    let ignore = false
    async function loadAreas() {
      try {
        const data = await fetchJson<CountryAreas[]>(
          countryAreasUrl,
          'Country statistics request failed',
        )
        const areas = validateAreas(data)
        if (!ignore) setCountryAreas(areas)
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
        const data = await fetchJson<Countries>(
          countriesUrl,
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
      <a className="home-link" href="../">
        ← My GIS module
      </a>
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
              aria-label={`${projectionName} world map${showDistortion ? ' with distortion circles' : ''}, ${selectedName} selected`}
            >
              <path className="ocean" d={morphOutlinePath ?? undefined} />
              <g className="countries">
                {countryPaths.map(({ code, name, d }) => (
                  <path
                    key={code}
                    className="country"
                    data-code={code}
                    d={d}
                    onClick={() => setSelectedCode(code)}
                  >
                    <title>{name}</title>
                  </path>
                ))}
              </g>
              <path className="selected-country" d={selectedPath?.d} />
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
                    ? `${countries.features.length} countries · click a country or use the list`
                    : 'Loading map...')}
              </p>
              <span className="circle-legend">3° circles</span>
            </figcaption>
          </figure>
          <aside className="country-study" aria-labelledby="country-title">
            <h2 id="country-title">{selectedName}</h2>
            <label className="country-picker">
              <span>Country</span>
              <select
                value={selectedCode}
                disabled={!countryAreas}
                onChange={(event) => setSelectedCode(event.currentTarget.value)}
              >
                {areaList.length === 0 && (
                  <option value={selectedCode}>{selectedName}</option>
                )}
                {areaList.map((country) => (
                  <option key={country.country_code} value={country.country_code}>
                    {country.admin}
                  </option>
                ))}
              </select>
            </label>
            <p className="area-context" aria-live="polite">
              {morphAmount === 0
                ? 'Mercator'
                : morphAmount === 1
                  ? 'Eckert IV'
                  : 'Blend area not calculated'}
            </p>
            {areaError ? (
              <p role="alert">{areaError}</p>
            ) : !countryAreas ? (
              <p role="status">Loading country areas...</p>
            ) : !selectedAreas ? (
              <p role="status">No statistics for {selectedName}.</p>
            ) : (
              <>
                {selectedAreas.clipping.is_clipped && (
                  <p className="area-flag">
                    Clipped at ±
                    {selectedAreas.clipping.latitude_limit_deg.toFixed(2)}°,
                    where Mercator area becomes unbounded.{' '}
                    {percentFormat.format(
                      selectedAreas.clipping.clipped_area_fraction,
                    )}{' '}
                    of the area is kept; ratios use the clipped region.
                  </p>
                )}
                {selectedAreas.status !== 'ok' && (
                  <p className="area-flag">
                    Check flag: {selectedAreas.status.replaceAll(',', ', ')}
                  </p>
                )}
                <dl className="reference-areas">
                  <div>
                    <dt>
                      WGS 84 ellipsoid
                      {selectedAreas.clipping.is_clipped ? ' (whole country)' : ''}
                    </dt>
                    <dd>{formatArea(selectedAreas.ellipsoidal_area_m2)}</dd>
                  </div>
                  <div>
                    <dt>
                      Sphere · reference
                      {selectedAreas.clipping.is_clipped ? ' (clipped)' : ''}
                    </dt>
                    <dd>
                      {formatArea(selectedAreas.spherical_reference_area_m2)}
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
                      const result = selectedAreas.projections[key]
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
                    <tr>
                      <th scope="row">
                        sec²(φ) at centroid
                        <span className="projected-area">
                          φ = {formatLatitude(selectedAreas.centroid_latitude_deg)}
                        </span>
                      </th>
                      <td>
                        {ratioFormat.format(selectedAreas.sec2_at_centroid)}×
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="area-note">
                  Mercator is{' '}
                  {ratioFormat.format(selectedAreas.merc_ratio_over_sec2)}× the
                  centroid prediction. Endpoint values, not screen areas.
                </p>
              </>
            )}
          </aside>
        </div>
      </section>
      <section className="chart-study" aria-labelledby="chart-title">
        <div className="chart-heading">
          <h2 id="chart-title">Distortion vs latitude</h2>
          <p id="chart-description">
            Mercator area ratio of each country at its area-weighted centroid
            latitude, against the theoretical scale sec²φ. Focus the chart and
            use the arrow keys to step through countries.
          </p>
        </div>
        {areaError ? (
          <p role="alert">{areaError}</p>
        ) : !countryAreas ? (
          <p role="status">Loading chart...</p>
        ) : (
          <>
            <DistortionChart
              countries={areaList}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
              describedBy="chart-description"
            />
            <ul className="chart-legend">
              <li className="legend-point">Country</li>
              <li className="legend-clipped">Clipped at ±85.05°</li>
              <li className="legend-flagged">Check flag</li>
              <li className="legend-curve">sec²φ</li>
            </ul>
          </>
        )}
      </section>
      <footer className="study-footer">
        <details className="method-notes">
          <summary>Method</summary>
          <dl>
            <div>
              <dt>Mercator keeps shapes</dt>
              <dd>
                It is conformal: small shapes and angles look right, which is
                why it is used for navigation. To do that it stretches the map
                by sec φ both east–west and north–south, so area grows by sec²φ:
                4× at 60°, about 33× at 80°.
              </dd>
            </div>
            <div>
              <dt>Eckert IV keeps areas</dt>
              <dd>
                It is equal-area: every country keeps its true share of the
                globe (ratio 1), but shapes are squeezed towards the edges.
              </dd>
            </div>
            <div>
              <dt>The circles</dt>
              <dd>
                Each red shape is the same 3° circle on the globe. Watch them
                grow and flatten: that is Tissot&apos;s indicatrix, made with
                small circles instead of infinitely small ones.
              </dd>
            </div>
            <div>
              <dt>Why dots sit above the curve</dt>
              <dd>
                The curve is the stretch at one latitude. A country spanning
                many latitudes averages them, and its poleward part gains more
                than the rest loses, so its ratio beats the curve at its centre.
              </dd>
            </div>
            <div>
              <dt>Sphere, not ellipsoid</dt>
              <dd>
                Ratios compare with the area on a sphere of radius 6,371 km. The
                WGS 84 ellipsoid area is shown for reference; it differs by
                under 1% for every country.
              </dd>
            </div>
            <div>
              <dt>What is not measured</dt>
              <dd>
                Slider positions between the ends mix both formulas, keep
                neither shapes nor areas and are resized to fit, so no area is
                calculated for them. Mercator stops at ±85.05°; Antarctica is
                clipped there. Borders are simplified.
              </dd>
            </div>
          </dl>
        </details>
        {isStatic && (
          <p className="static-note">
            Static snapshot: geometries and areas exported from the FastAPI +
            PostGIS version.
          </p>
        )}
        <a href="https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/">
          Natural Earth · 1:110m
        </a>
      </footer>
    </main>
  )
}

export default App
