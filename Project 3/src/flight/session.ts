// One flight of the broom from start (or restart) onward: advances the flight
// model, keeps the broom above the ground it is told about, and records the
// track flown. Knows nothing about Cesium; FlightSim feeds it frames and
// ground samples.

import { distance, initialFlightState, stepFlight, type FlightInput, type FlightState } from './physics'

// Longest step simulated in one tick, so a stalled tab doesn't teleport the broom.
const MAX_TICK = 0.1
const GROUND_CLEARANCE = 3
// Deepest the broom can sink into terrain between two ground samples (≈ 35 m
// at full speed in a steep dive). Anything deeper is a coarse tile, not ground.
const MAX_GROUND_PENETRATION = 40
const TRACK_MIN_DISTANCE = 25 // meters between recorded track points

const DEG = Math.PI / 180

/** Degrees. */
export interface TrackPoint {
  latitude: number
  longitude: number
}

export interface FlightSnapshot {
  flight: FlightState
  /** Height above the ground below, if it could be sampled. */
  aboveGround: number | undefined
  groundContact: boolean
  /**
   * Path flown, one segment per flight; a restart begins a new segment. A new
   * array whenever a point is added, so it can be compared by reference.
   */
  track: readonly (readonly TrackPoint[])[]
}

export interface FlightSession {
  /** Advance by `dt` seconds (capped at 0.1 s) with the given controls. */
  tick(input: FlightInput, dt: number): void
  /**
   * Report the ellipsoidal height of the ground under the broom, or undefined
   * if it couldn't be sampled. Samples far above the broom are treated as
   * coarse levels of detail and ignored; real ground lifts the broom clear.
   */
  groundSampled(ground: number | undefined): void
  /** Restart over Lillehammer, beginning a new track segment. */
  reset(): void
  snapshot(): FlightSnapshot
}

const trackPoint = ({ latitude, longitude }: FlightState): TrackPoint => ({
  latitude: latitude / DEG,
  longitude: longitude / DEG,
})

export function createFlightSession(): FlightSession {
  let flight = initialFlightState()
  let aboveGround: number | undefined
  let groundContact = false
  let track: TrackPoint[][] = [[trackPoint(flight)]]

  const recordTrack = () => {
    const segment = track[track.length - 1]
    const last = segment[segment.length - 1]
    const lastRadians = { latitude: last.latitude * DEG, longitude: last.longitude * DEG }
    if (distance(lastRadians, flight) < TRACK_MIN_DISTANCE) return
    track = [...track.slice(0, -1), [...segment, trackPoint(flight)]]
  }

  return {
    tick(input, dt) {
      flight = stepFlight(flight, input, Math.min(dt, MAX_TICK))
      recordTrack()
    },

    groundSampled(ground) {
      const clearance = ground === undefined ? undefined : flight.height - ground
      aboveGround =
        clearance === undefined || clearance < -MAX_GROUND_PENETRATION ? undefined : clearance
      groundContact = aboveGround !== undefined && aboveGround < GROUND_CLEARANCE
      if (groundContact && ground !== undefined) {
        flight = { ...flight, height: ground + GROUND_CLEARANCE, pitch: Math.max(flight.pitch, 0) }
      }
    },

    reset() {
      flight = initialFlightState()
      aboveGround = undefined
      groundContact = false
      track = [...track, [trackPoint(flight)]]
    },

    snapshot: () => ({ flight, aboveGround, groundContact, track }),
  }
}
