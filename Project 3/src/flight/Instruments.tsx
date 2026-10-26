// Glass-cockpit style instruments for the broom flight simulator.

const ADI_SIZE = 140
const PX_PER_PITCH_DEG = 2.4

/** Attitude indicator: the horizon tilts with roll and slides with pitch. */
export function AttitudeIndicator({ pitch, roll }: { pitch: number; roll: number }) {
  const r = ADI_SIZE / 2
  const offset = pitch * PX_PER_PITCH_DEG
  const ladder = [-30, -20, -10, 10, 20, 30]

  return (
    <svg
      className="adi"
      width={ADI_SIZE}
      height={ADI_SIZE}
      viewBox={`${-r} ${-r} ${ADI_SIZE} ${ADI_SIZE}`}
      role="img"
      aria-label={`Attitude: pitch ${Math.round(pitch)} degrees, roll ${Math.round(roll)} degrees`}
    >
      <defs>
        <clipPath id="adi-clip">
          <circle r={r - 4} />
        </clipPath>
      </defs>
      <g clipPath="url(#adi-clip)">
        <g transform={`rotate(${-roll}) translate(0 ${offset})`}>
          <rect className="adi-sky" x={-ADI_SIZE} y={-ADI_SIZE * 2} width={ADI_SIZE * 2} height={ADI_SIZE * 2} />
          <rect className="adi-earth" x={-ADI_SIZE} y={0} width={ADI_SIZE * 2} height={ADI_SIZE * 2} />
          <line className="adi-horizon" x1={-ADI_SIZE} x2={ADI_SIZE} y1={0} y2={0} />
          {ladder.map((deg) => {
            const y = -deg * PX_PER_PITCH_DEG
            const half = deg % 20 === 0 ? 22 : 14
            return (
              <g key={deg} className="adi-ladder">
                <line x1={-half} x2={half} y1={y} y2={y} />
                <text x={half + 4} y={y + 3.5}>{Math.abs(deg)}</text>
              </g>
            )
          })}
        </g>
      </g>

      {/* Roll scale, fixed to the instrument; the pointer turns with the horizon. */}
      <g className="adi-roll-scale">
        {[-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60].map((deg) => (
          <line
            key={deg}
            transform={`rotate(${deg})`}
            x1={0}
            x2={0}
            y1={-r + 4}
            y2={deg % 30 === 0 ? -r + 13 : -r + 9}
          />
        ))}
      </g>
      <polygon className="adi-roll-pointer" transform={`rotate(${-roll})`} points={`0,${-r + 14} -5,${-r + 22} 5,${-r + 22}`} />

      {/* Fixed broom symbol */}
      <g className="adi-symbol">
        <path d="M -42 0 H -14 L -8 7 M 42 0 H 14 L 8 7" />
        <circle r={2.5} />
      </g>
      <circle className="adi-bezel" r={r - 2} />
    </svg>
  )
}

const TAPE_WIDTH = 360
const PX_PER_HEADING_DEG = 4
const CARDINALS: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }

/** Heading tape: a compass strip that scrolls under a fixed lubber line. */
export function HeadingTape({ heading }: { heading: number }) {
  const span = TAPE_WIDTH / PX_PER_HEADING_DEG / 2
  const first = Math.ceil((heading - span) / 5) * 5
  const ticks: number[] = []
  for (let deg = first; deg <= heading + span; deg += 5) ticks.push(deg)
  const rounded = Math.round(heading) % 360

  return (
    <div className="heading-tape" role="img" aria-label={`Heading ${rounded} degrees`}>
      <svg width={TAPE_WIDTH} height={34} viewBox={`0 0 ${TAPE_WIDTH} 34`} aria-hidden="true">
        {ticks.map((deg) => {
          const x = TAPE_WIDTH / 2 + (deg - heading) * PX_PER_HEADING_DEG
          const normalized = ((deg % 360) + 360) % 360
          const major = normalized % 10 === 0
          return (
            <g key={deg} className={CARDINALS[normalized] ? 'tape-cardinal' : undefined}>
              <line x1={x} x2={x} y1={34} y2={major ? 24 : 29} />
              {major && (
                <text x={x} y={18} textAnchor="middle">
                  {CARDINALS[normalized] ?? String(normalized / 10).padStart(2, '0')}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <output className="heading-readout">{String(rounded).padStart(3, '0')}°</output>
    </div>
  )
}

/** Vertical throttle lever. */
export function ThrottleLever({ value }: { value: number }) {
  const percent = Math.round(value * 100)
  return (
    <div className="throttle" role="meter" aria-label="Throttle" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="throttle-track">
        <div className="throttle-fill" style={{ height: `${percent}%` }} />
        <div className="throttle-handle" style={{ bottom: `${percent}%` }} />
      </div>
      <span className="instrument-label">Throttle</span>
      <span className="instrument-value small">{percent}%</span>
    </div>
  )
}
