import {
  Axis,
  Cartesian3,
  Cartographic,
  HeadingPitchRange,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  Model,
  Transforms,
  type Viewer,
} from 'cesium'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import Minimap from './Minimap'
import {
  FEET_PER_METER,
  GEOID_SEPARATION,
  KNOTS_PER_MPS,
  initialFlightState,
  stepFlight,
  type FlightInput,
  type FlightState,
} from './physics'
import './FlightSim.css'

const MODEL_URL = `${import.meta.env.BASE_URL}models/wizard-on-broom.glb`
const MODEL_SCALE = 3
const CHASE_RANGE = 45
const CHASE_PITCH = CesiumMath.toRadians(-12)
const GROUND_CLEARANCE = 3
const HUD_INTERVAL_MS = 100
const GROUND_SAMPLE_INTERVAL_MS = 250
// Deepest the broom can sink into terrain between two ground samples (≈ 35 m
// at full speed in a steep dive). Anything deeper is a coarse tile, not ground.
const MAX_GROUND_PENETRATION = 40

const CONTROL_KEYS = ['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyR']

interface HudState {
  flight: FlightState
  /** Height above the ground below, if it could be sampled. */
  aboveGround: number | undefined
  groundContact: boolean
  flightId: number
}

function readInput(keys: Set<string>): FlightInput {
  const axis = (positive: string, negative: string) =>
    (keys.has(positive) ? 1 : 0) - (keys.has(negative) ? 1 : 0)
  return {
    throttle: axis('KeyW', 'KeyS'),
    // Stick convention: push forward (↑) to dive, pull back (↓) to climb.
    pitch: axis('ArrowDown', 'ArrowUp'),
    roll: axis('ArrowRight', 'ArrowLeft'),
  }
}

/** Model orientation in the local east-north-up frame (model axes: +X forward, +Y left, +Z up). */
function localRotation({ heading, pitch, roll }: FlightState) {
  const forward = new Cartesian3(
    Math.sin(heading) * Math.cos(pitch),
    Math.cos(heading) * Math.cos(pitch),
    Math.sin(pitch),
  )
  const levelRight = new Cartesian3(Math.cos(heading), -Math.sin(heading), 0)
  const levelUp = Cartesian3.cross(levelRight, forward, new Cartesian3())
  const right = Cartesian3.subtract(
    Cartesian3.multiplyByScalar(levelRight, Math.cos(roll), new Cartesian3()),
    Cartesian3.multiplyByScalar(levelUp, Math.sin(roll), new Cartesian3()),
    new Cartesian3(),
  )
  const up = Cartesian3.add(
    Cartesian3.multiplyByScalar(levelUp, Math.cos(roll), new Cartesian3()),
    Cartesian3.multiplyByScalar(levelRight, Math.sin(roll), new Cartesian3()),
    new Cartesian3(),
  )
  const left = Cartesian3.negate(right, new Cartesian3())
  return Matrix3.fromColumnMajorArray([
    forward.x, forward.y, forward.z,
    left.x, left.y, left.z,
    up.x, up.y, up.z,
  ])
}

function FlightSim({ viewer }: { viewer: Viewer }) {
  const keysRef = useRef(new Set<string>())
  const [pressed, setPressed] = useState<string[]>([])
  const [hud, setHud] = useState<HudState>(() => ({
    flight: initialFlightState(),
    aboveGround: undefined,
    groundContact: false,
    flightId: 0,
  }))

  useEffect(() => {
    const keys = keysRef.current
    const sync = () => setPressed([...keys])
    const onKeyDown = (event: KeyboardEvent) => {
      if (!CONTROL_KEYS.includes(event.code)) return
      event.preventDefault()
      keys.add(event.code)
      sync()
    }
    const onKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code)
      sync()
    }
    const onBlur = () => {
      keys.clear()
      sync()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      keys.clear()
    }
  }, [])

  useEffect(() => {
    const scene = viewer.scene
    const camera = viewer.camera
    camera.cancelFlight()
    scene.screenSpaceCameraController.enableInputs = false

    let model: Model | undefined
    let destroyed = false
    // The generated model faces +X (see scripts/generate-wizard-model.mjs).
    Model.fromGltfAsync({ url: MODEL_URL, scale: MODEL_SCALE, forwardAxis: Axis.X })
      .then((loaded) => {
        if (destroyed) {
          loaded.destroy()
          return
        }
        model = scene.primitives.add(loaded)
      })
      .catch((error) => console.error('Failed to load wizard model', error))

    let state = initialFlightState()
    let flightId = 0
    let aboveGround: number | undefined
    let groundContact = false
    let lastFrame = performance.now()
    let lastHud = 0
    let lastGroundSample = 0
    let resetHeld = false

    const removeListener = scene.preRender.addEventListener(() => {
      const now = performance.now()
      const dt = Math.min((now - lastFrame) / 1000, 0.1)
      lastFrame = now

      const keys = keysRef.current
      if (keys.has('KeyR') && !resetHeld) {
        state = initialFlightState()
        flightId += 1
      }
      resetHeld = keys.has('KeyR')

      state = stepFlight(state, readInput(keys), dt)

      const position = Cartesian3.fromRadians(state.longitude, state.latitude, state.height)
      if (model) {
        model.modelMatrix = Matrix4.multiply(
          Transforms.eastNorthUpToFixedFrame(position),
          Matrix4.fromRotation(localRotation(state)),
          new Matrix4(),
        )
      }
      // Third-person chase camera behind and slightly above the wizard.
      camera.lookAt(position, new HeadingPitchRange(state.heading, CHASE_PITCH, CHASE_RANGE))

      if (now - lastHud > HUD_INTERVAL_MS) {
        lastHud = now
        setHud({ flight: state, aboveGround, groundContact, flightId })
      }
    })

    // Keep the broom above the photorealistic tiles. Sampled after the frame
    // is drawn: sampleHeight renders its own pass and returns wrong heights
    // when called from preRender. Right after a jump, coarse levels of detail
    // report a surface far above the real ground until finer tiles load;
    // those samples are ignored rather than lifting the broom onto them.
    const removeGroundListener = scene.postRender.addEventListener(() => {
      const now = performance.now()
      if (!scene.sampleHeightSupported || now - lastGroundSample < GROUND_SAMPLE_INTERVAL_MS) return
      lastGroundSample = now
      const ground = scene.sampleHeight(
        new Cartographic(state.longitude, state.latitude),
        model ? [model] : undefined,
      )
      aboveGround =
        ground === undefined || state.height - ground < -MAX_GROUND_PENETRATION
          ? undefined
          : state.height - ground
      groundContact = aboveGround !== undefined && aboveGround < GROUND_CLEARANCE
      if (groundContact && ground !== undefined) {
        state = { ...state, height: ground + GROUND_CLEARANCE, pitch: Math.max(state.pitch, 0) }
      }
    })

    return () => {
      destroyed = true
      removeListener()
      removeGroundListener()
      if (model && !model.isDestroyed()) scene.primitives.remove(model)
      camera.lookAtTransform(Matrix4.IDENTITY)
      scene.screenSpaceCameraController.enableInputs = true
    }
  }, [viewer])

  const { flight, aboveGround, groundContact, flightId } = hud
  const pitchDeg = CesiumMath.toDegrees(flight.pitch)
  const rollDeg = CesiumMath.toDegrees(flight.roll)
  const headingDeg = CesiumMath.toDegrees(flight.heading)
  const altitudeFt = (flight.height - GEOID_SEPARATION) * FEET_PER_METER
  const isDown = (code: string) => pressed.includes(code)

  return (
    <>
      <aside className="flight-hud" aria-label="Flight instruments">
        <header className="flight-hud-header">Broom flight simulator</header>

        <Gauge label="Throttle" value={`${Math.round(flight.throttle * 100)} %`}>
          <div className="gauge-bar">
            <div className="gauge-fill" style={{ width: `${flight.throttle * 100}%` }} />
          </div>
        </Gauge>
        <Gauge label="Pitch" value={`${pitchDeg.toFixed(0)}°`}>
          <CenteredBar value={pitchDeg / 60} />
        </Gauge>
        <Gauge label="Roll" value={`${rollDeg.toFixed(0)}°`}>
          <CenteredBar value={rollDeg / 75} />
        </Gauge>

        <table className="flight-readout">
          <tbody>
            <tr>
              <th>Airspeed</th>
              <td>{Math.round(flight.speed * KNOTS_PER_MPS)} kt</td>
            </tr>
            <tr>
              <th>Altitude</th>
              <td>{Math.round(altitudeFt).toLocaleString('en-US')} ft MSL</td>
            </tr>
            <tr>
              <th>Above ground</th>
              <td>
                {aboveGround === undefined
                  ? '—'
                  : `${Math.round(aboveGround * FEET_PER_METER).toLocaleString('en-US')} ft`}
              </td>
            </tr>
            <tr>
              <th>Heading</th>
              <td>{String(Math.round(headingDeg) % 360).padStart(3, '0')}°</td>
            </tr>
          </tbody>
        </table>

        {groundContact && <p className="flight-warning">GROUND! Pull up (↓)</p>}

        <table className="flight-keys">
          <tbody>
            <KeyRow label="Throttle" keys={[['KeyW', 'W', 'up'], ['KeyS', 'S', 'down']]} isDown={isDown} />
            <KeyRow label="Pitch" keys={[['ArrowDown', '↓', 'nose up'], ['ArrowUp', '↑', 'nose down']]} isDown={isDown} />
            <KeyRow label="Roll" keys={[['ArrowLeft', '←', 'left'], ['ArrowRight', '→', 'right']]} isDown={isDown} />
            <KeyRow label="Reset" keys={[['KeyR', 'R', 'restart']]} isDown={isDown} />
          </tbody>
        </table>
      </aside>

      <Minimap
        latitude={CesiumMath.toDegrees(flight.latitude)}
        longitude={CesiumMath.toDegrees(flight.longitude)}
        heading={headingDeg}
        flightId={flightId}
      />
    </>
  )
}

function Gauge({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="gauge">
      <div className="gauge-label">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      {children}
    </div>
  )
}

/** Bar centered on zero; value in -1 … 1. */
function CenteredBar({ value }: { value: number }) {
  const clamped = Math.max(-1, Math.min(1, value))
  return (
    <div className="gauge-bar centered">
      <div
        className="gauge-fill"
        style={{
          left: clamped < 0 ? `${50 + clamped * 50}%` : '50%',
          width: `${Math.abs(clamped) * 50}%`,
        }}
      />
    </div>
  )
}

function KeyRow({
  label,
  keys,
  isDown,
}: {
  label: string
  keys: [code: string, key: string, action: string][]
  isDown: (code: string) => boolean
}) {
  return (
    <tr>
      <th>{label}</th>
      <td>
        {keys.map(([code, key, action]) => (
          <span key={code} className="flight-key-pair">
            <kbd className={isDown(code) ? 'down' : undefined}>{key}</kbd> {action}
          </span>
        ))}
      </td>
    </tr>
  )
}

export default FlightSim
