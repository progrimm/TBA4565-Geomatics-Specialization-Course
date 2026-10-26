// Simple arcade flight model for the broom. Angles are in radians, distances in
// meters, speeds in m/s. Heading is a compass bearing (0 = north, clockwise).

export interface FlightState {
  longitude: number
  latitude: number
  /** Ellipsoidal (WGS84) height in meters. */
  height: number
  heading: number
  pitch: number
  roll: number
  speed: number
  /** 0 – 1 */
  throttle: number
}

export interface FlightInput {
  /** -1 (nose down) … 1 (nose up) */
  pitch: number
  /** -1 (roll left) … 1 (roll right) */
  roll: number
  /** -1 (decrease) … 1 (increase) */
  throttle: number
}

const EARTH_RADIUS = 6_371_000
const GRAVITY = 9.81
const DEG = Math.PI / 180

// Geoid separation around Lillehammer–Oslo (≈ 38–40 m) used to convert
// between ellipsoidal heights and altitude above mean sea level.
const GEOID_SEPARATION = 39.4
const METERS_PER_FOOT = 0.3048

const MIN_SPEED = 25
const MAX_SPEED = 140

const PITCH_RATE = 35 * DEG
const ROLL_RATE = 70 * DEG
const THROTTLE_RATE = 0.4
const MAX_PITCH = 60 * DEG
const MAX_ROLL = 75 * DEG

const LILLEHAMMER = { longitude: 10.4641 * DEG, latitude: 61.1151 * DEG }
const OSLO = { longitude: 10.7522 * DEG, latitude: 59.9139 * DEG }

/** Altitude above mean sea level, in meters, of an ellipsoidal height. */
export function altitudeMsl(height: number) {
  return height - GEOID_SEPARATION
}

/** Great-circle (haversine) distance in meters between a and b. */
export function distance(
  from: { longitude: number; latitude: number },
  to: { longitude: number; latitude: number },
) {
  const dLat = to.latitude - from.latitude
  const dLon = to.longitude - from.longitude
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from.latitude) * Math.cos(to.latitude) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(a))
}

/** Initial great-circle bearing from a to b. */
export function bearing(
  from: { longitude: number; latitude: number },
  to: { longitude: number; latitude: number },
) {
  const dLon = to.longitude - from.longitude
  const y = Math.sin(dLon) * Math.cos(to.latitude)
  const x =
    Math.cos(from.latitude) * Math.sin(to.latitude) -
    Math.sin(from.latitude) * Math.cos(to.latitude) * Math.cos(dLon)
  return (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI)
}

/** Start over Lillehammer at 2,000 ft above mean sea level, headed for Oslo. */
export function initialFlightState(): FlightState {
  return {
    ...LILLEHAMMER,
    height: 2000 * METERS_PER_FOOT + GEOID_SEPARATION,
    heading: bearing(LILLEHAMMER, OSLO),
    pitch: 0,
    roll: 0,
    speed: 60,
    throttle: 0.35,
  }
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export function stepFlight(state: FlightState, input: FlightInput, dt: number): FlightState {
  const throttle = clamp(state.throttle + input.throttle * THROTTLE_RATE * dt, 0, 1)
  const pitch = clamp(state.pitch + input.pitch * PITCH_RATE * dt, -MAX_PITCH, MAX_PITCH)
  const roll = clamp(state.roll + input.roll * ROLL_RATE * dt, -MAX_ROLL, MAX_ROLL)

  // Speed eases toward the throttle setting; climbing bleeds speed, diving adds it.
  const targetSpeed = MIN_SPEED + throttle * (MAX_SPEED - MIN_SPEED)
  const speed = clamp(
    state.speed + ((targetSpeed - state.speed) * 0.5 - GRAVITY * Math.sin(pitch) * 0.5) * dt,
    MIN_SPEED * 0.6,
    MAX_SPEED * 1.3,
  )

  // Coordinated turn: banking turns the broom.
  const turnRate = (GRAVITY * Math.tan(roll)) / speed
  const heading = (state.heading + turnRate * dt + 2 * Math.PI) % (2 * Math.PI)

  const horizontal = speed * Math.cos(pitch) * dt
  const latitude = state.latitude + (horizontal * Math.cos(heading)) / EARTH_RADIUS
  const longitude =
    state.longitude +
    (horizontal * Math.sin(heading)) / (EARTH_RADIUS * Math.cos(state.latitude))
  const height = state.height + speed * Math.sin(pitch) * dt

  return { longitude, latitude, height, heading, pitch, roll, speed, throttle }
}
