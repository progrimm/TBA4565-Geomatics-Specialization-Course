import { scaleLinear, scaleLog } from 'd3-scale'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import type { CountryAreas } from './countryAreas'

const margin = { top: 16, right: 16, bottom: 44, left: 52 }
const tooltipWidth = 190
const sec2 = (latitude: number) => 1 / Math.cos((latitude * Math.PI) / 180) ** 2
const ratioFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const latitudeFormat = (latitude: number) =>
  `${Math.abs(latitude).toFixed(1)}°${latitude >= 0 ? 'N' : 'S'}`

// Log ticks at 1, 2 and 5 times each power of ten keep the axis readable.
function logTicks(ticks: number[]) {
  return ticks.filter((tick) => {
    const mantissa = Math.round(tick / 10 ** Math.floor(Math.log10(tick) + 1e-9))
    return mantissa === 1 || mantissa === 2 || mantissa === 5
  })
}

type Props = {
  countries: CountryAreas[]
  selectedCode: string
  onSelect: (code: string) => void
  describedBy?: string
}

const keySteps: Record<string, (index: number, last: number) => number> = {
  ArrowRight: (index, last) => Math.min(last, index + 1),
  ArrowUp: (index, last) => Math.min(last, index + 1),
  ArrowLeft: (index) => Math.max(0, index - 1),
  ArrowDown: (index) => Math.max(0, index - 1),
  Home: () => 0,
  End: (_, last) => last,
}

function DistortionChart({
  countries,
  selectedCode,
  onSelect,
  describedBy,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(280, Math.round(entry.contentRect.width))),
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const height = width < 600 ? 320 : 400
  const maxRatio = Math.max(...countries.map((c) => c.projections.merc.area_ratio))
  const x = scaleLinear()
    .domain([-90, 90])
    .range([margin.left, width - margin.right])
  const y = scaleLog()
    .domain([1, maxRatio * 1.25])
    .range([height - margin.bottom, margin.top])
  const [, yMax] = y.domain()
  // About one latitude label per 80 px of plot width, between 3 and 6.
  const latitudeTickCount = Math.min(
    6,
    Math.max(3, Math.floor((width - margin.left - margin.right) / 80)),
  )

  const curve = Array.from({ length: 341 }, (_, index) => -85 + index * 0.5)
    .filter((latitude) => sec2(latitude) <= yMax)
    .map((latitude, index) =>
      `${index ? 'L' : 'M'}${x(latitude).toFixed(1)},${y(sec2(latitude)).toFixed(1)}`,
    )
    .join('')

  const selected = countries.find((c) => c.country_code === selectedCode)
  const hovered = countries.find((c) => c.country_code === hoveredCode)
  const tooltipCountry = hovered ?? selected
  const byLatitude = useMemo(
    () =>
      [...countries].sort(
        (a, b) => a.centroid_latitude_deg - b.centroid_latitude_deg,
      ),
    [countries],
  )
  const selectedIndex = byLatitude.findIndex(
    (c) => c.country_code === selectedCode,
  )

  // The chart is an ARIA slider over countries ordered south to north, so
  // screen readers pass the arrow and Home/End keys through and announce
  // aria-valuetext. Modified keys stay with the browser and assistive tech.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = keySteps[event.key]
    if (!step || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return
    event.preventDefault()
    setHoveredCode(null)
    const next = step(Math.max(0, selectedIndex), byLatitude.length - 1)
    onSelect(byLatitude[next].country_code)
  }

  const pointX = (c: CountryAreas) => x(c.centroid_latitude_deg)
  const pointY = (c: CountryAreas) => y(c.projections.merc.area_ratio)
  // Draw the selected point last so it stays on top.
  const ordered = [...countries].sort(
    (a, b) =>
      Number(a.country_code === selectedCode) -
      Number(b.country_code === selectedCode),
  )

  return (
    <div
      className="chart-frame"
      ref={containerRef}
      tabIndex={0}
      role="slider"
      aria-label="Country, ordered by centroid latitude"
      aria-describedby={describedBy}
      aria-valuemin={1}
      aria-valuemax={byLatitude.length}
      aria-valuenow={selectedIndex >= 0 ? selectedIndex + 1 : undefined}
      aria-valuetext={
        selected &&
        `${selected.admin}, ${latitudeFormat(selected.centroid_latitude_deg)}, Mercator ${ratioFormat.format(selected.projections.merc.area_ratio)} times, sec² prediction ${ratioFormat.format(selected.sec2_at_centroid)} times`
      }
      onKeyDown={handleKeyDown}
    >
      <svg
        className="distortion-chart"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={`Scatter of Mercator area ratio against centroid latitude for ${countries.length} countries, log scale, with the sec² latitude curve`}
        onPointerLeave={() => setHoveredCode(null)}
      >
        <g className="chart-grid">
          {x.ticks(latitudeTickCount).map((tick) => (
            <g key={`x${tick}`} transform={`translate(${x(tick)},0)`}>
              <line y1={margin.top} y2={height - margin.bottom} />
              <text y={height - margin.bottom + 18} textAnchor="middle">
                {tick === 0 ? '0°' : latitudeFormat(tick).replace('.0', '')}
              </text>
            </g>
          ))}
          {logTicks(y.ticks()).map((tick) => (
            <g key={`y${tick}`} transform={`translate(0,${y(tick)})`}>
              <line x1={margin.left} x2={width - margin.right} />
              <text x={margin.left - 8} dy="0.32em" textAnchor="end">
                {tick}×
              </text>
            </g>
          ))}
        </g>
        <text
          className="axis-label"
          x={(margin.left + width - margin.right) / 2}
          y={height - 6}
          textAnchor="middle"
        >
          Centroid latitude
        </text>
        <text
          className="axis-label"
          transform={`translate(14,${(margin.top + height - margin.bottom) / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          Mercator area ratio (log)
        </text>
        <path className="sec2-curve" d={curve} />
        {ordered.map((country) => {
          const code = country.country_code
          const classes = [
            'chart-point',
            country.clipping.is_clipped ? 'clipped' : '',
            country.status !== 'ok' ? 'flagged' : '',
            code === selectedCode ? 'selected' : '',
            code === hoveredCode ? 'hovered' : '',
          ]
          return (
            <g
              key={code}
              className={classes.filter(Boolean).join(' ')}
              data-code={code}
              transform={`translate(${pointX(country)},${pointY(country)})`}
              onPointerEnter={() => setHoveredCode(code)}
              onClick={() => onSelect(code)}
            >
              <circle className="hit-area" r={10} />
              <circle className="mark" r={code === selectedCode ? 6 : 4.5} />
            </g>
          )
        })}
      </svg>
      {tooltipCountry && (
        <div
          className="chart-tooltip"
          aria-hidden="true"
          style={{
            // Beside the point, on whichever side has room, so it never covers it.
            left:
              pointX(tooltipCountry) + 12 + tooltipWidth <= width
                ? pointX(tooltipCountry) + 12
                : Math.max(0, pointX(tooltipCountry) - 12 - tooltipWidth),
            top: Math.max(0, pointY(tooltipCountry) - 24),
            width: tooltipWidth,
          }}
        >
          <strong>{tooltipCountry.admin}</strong>
          <span>
            {latitudeFormat(tooltipCountry.centroid_latitude_deg)} · Mercator{' '}
            {ratioFormat.format(tooltipCountry.projections.merc.area_ratio)}× ·
            sec²φ {ratioFormat.format(tooltipCountry.sec2_at_centroid)}×
          </span>
        </div>
      )}
    </div>
  )
}

export default DistortionChart
