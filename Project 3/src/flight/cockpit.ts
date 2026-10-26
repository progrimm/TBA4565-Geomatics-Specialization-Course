import { altitudeMsl } from './physics'
import type { FlightSnapshot } from './session'

const FEET_PER_METER = 3.28084
const KNOTS_PER_MPS = 1.94384
const DEG = Math.PI / 180

/** What the cockpit shows, in the units a pilot reads them in. */
export interface CockpitReadings {
  airspeedKt: number
  /** Feet above mean sea level. */
  altitudeFt: number
  /** Feet above the ground below, if it could be sampled. */
  aboveGroundFt: number | undefined
  groundContact: boolean
  /** 0 – 100 */
  throttlePercent: number
  pitchDeg: number
  rollDeg: number
  /** Compass degrees. */
  headingDeg: number
  latitudeDeg: number
  longitudeDeg: number
}

export function readCockpit({ flight, aboveGround, groundContact }: FlightSnapshot): CockpitReadings {
  return {
    airspeedKt: Math.round(flight.speed * KNOTS_PER_MPS),
    altitudeFt: Math.round(altitudeMsl(flight.height) * FEET_PER_METER),
    aboveGroundFt: aboveGround === undefined ? undefined : Math.round(aboveGround * FEET_PER_METER),
    groundContact,
    throttlePercent: Math.round(flight.throttle * 100),
    pitchDeg: flight.pitch / DEG,
    rollDeg: flight.roll / DEG,
    headingDeg: flight.heading / DEG,
    latitudeDeg: flight.latitude / DEG,
    longitudeDeg: flight.longitude / DEG,
  }
}
