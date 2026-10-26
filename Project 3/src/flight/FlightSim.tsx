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
import { useEffect, useState } from 'react'
import { readCockpit } from './cockpit'
import { CONTROL_LEGEND, useFlightControls, type ControlKey } from './controls'
import { AttitudeIndicator, HeadingTape, ThrottleLever } from './Instruments'
import Minimap from './Minimap'
import type { FlightState } from './physics'
import { createFlightSession } from './session'
import './FlightSim.css'

const MODEL_URL = `${import.meta.env.BASE_URL}models/wizard-on-broom.glb`
const MODEL_SCALE = 3
const CHASE_RANGE = 24
const CHASE_PITCH = CesiumMath.toRadians(-12)
const HUD_INTERVAL_MS = 33
const GROUND_SAMPLE_INTERVAL_MS = 250

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
  const [session] = useState(createFlightSession)
  const { readInput, pressed } = useFlightControls(session.reset)
  const [snapshot, setSnapshot] = useState(session.snapshot)

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
        // The dynamic environment map reflects the dark ground below as
        // blotches on the broad cloth surfaces, so use plain sun lighting.
        loaded.environmentMapManager.enabled = false
        model = scene.primitives.add(loaded)
      })
      .catch((error) => console.error('Failed to load wizard model', error))

    let lastFrame = performance.now()
    let lastHud = 0
    let lastGroundSample = 0

    const removeListener = scene.preRender.addEventListener(() => {
      const now = performance.now()
      session.tick(readInput(), (now - lastFrame) / 1000)
      lastFrame = now

      const { flight } = session.snapshot()
      const position = Cartesian3.fromRadians(flight.longitude, flight.latitude, flight.height)
      if (model) {
        model.modelMatrix = Matrix4.multiply(
          Transforms.eastNorthUpToFixedFrame(position),
          Matrix4.fromRotation(localRotation(flight)),
          new Matrix4(),
        )
      }
      // Third-person chase camera behind and slightly above the wizard.
      camera.lookAt(position, new HeadingPitchRange(flight.heading, CHASE_PITCH, CHASE_RANGE))

      if (now - lastHud > HUD_INTERVAL_MS) {
        lastHud = now
        setSnapshot(session.snapshot())
      }
    })

    // Sampled after the frame is drawn: sampleHeight renders its own pass and
    // returns wrong heights when called from preRender.
    const removeGroundListener = scene.postRender.addEventListener(() => {
      const now = performance.now()
      if (!scene.sampleHeightSupported || now - lastGroundSample < GROUND_SAMPLE_INTERVAL_MS) return
      lastGroundSample = now
      const { flight } = session.snapshot()
      session.groundSampled(
        scene.sampleHeight(new Cartographic(flight.longitude, flight.latitude), model ? [model] : undefined),
      )
    })

    return () => {
      destroyed = true
      removeListener()
      removeGroundListener()
      if (model && !model.isDestroyed()) scene.primitives.remove(model)
      camera.lookAtTransform(Matrix4.IDENTITY)
      scene.screenSpaceCameraController.enableInputs = true
    }
  }, [viewer, session, readInput])

  const cockpit = readCockpit(snapshot)

  return (
    <>
      <HeadingTape heading={cockpit.headingDeg} />

      <section className="cockpit" aria-label="Flight instruments">
        <ThrottleLever percent={cockpit.throttlePercent} />

        <div className="readout">
          <span className="instrument-label">Airspeed</span>
          <span className="instrument-value">{cockpit.airspeedKt}</span>
          <span className="instrument-unit">knots</span>
        </div>

        <div className="adi-wrap">
          <AttitudeIndicator pitch={cockpit.pitchDeg} roll={cockpit.rollDeg} />
          {cockpit.groundContact && (
            <p className="terrain-alert" role="alert">
              Terrain. Pull up
            </p>
          )}
          <div className="attitude-values">
            <span>Pitch {cockpit.pitchDeg.toFixed(0)}°</span>
            <span>Roll {cockpit.rollDeg.toFixed(0)}°</span>
          </div>
        </div>

        <div className="readout">
          <span className="instrument-label">Altitude</span>
          {/* No thousands separator: in the monospaced face a comma reads as a gap. */}
          <span className="instrument-value">{cockpit.altitudeFt}</span>
          <span className="instrument-unit">
            ft MSL,{' '}
            {cockpit.aboveGroundFt === undefined
              ? 'ground loading'
              : `${cockpit.aboveGroundFt.toLocaleString('en-US')} ft above ground`}
          </span>
        </div>

        <dl className="key-legend">
          {CONTROL_LEGEND.map(({ label, keys }) => (
            <KeyGroup key={label} label={label} keys={keys} pressed={pressed} />
          ))}
        </dl>
      </section>

      <Minimap
        latitude={cockpit.latitudeDeg}
        longitude={cockpit.longitudeDeg}
        heading={cockpit.headingDeg}
        track={snapshot.track}
      />
    </>
  )
}

function KeyGroup({
  label,
  keys,
  pressed,
}: {
  label: string
  keys: ControlKey[]
  pressed: ReadonlySet<string>
}) {
  return (
    <div className="key-group">
      <dt>{label}</dt>
      <dd>
        {keys.map(({ code, glyph }) => (
          <kbd key={code} className={pressed.has(code) ? 'down' : undefined}>
            {glyph}
          </kbd>
        ))}
      </dd>
    </div>
  )
}

export default FlightSim
