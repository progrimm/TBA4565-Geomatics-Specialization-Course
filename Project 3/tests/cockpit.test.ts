import { describe, expect, it } from 'vitest'
import { readCockpit } from '../src/flight/cockpit'
import { createFlightSession } from '../src/flight/session'

describe('cockpit readings', () => {
  it('shows the start at 2000 ft MSL, 117 knots, headed south for Oslo', () => {
    const readings = readCockpit(createFlightSession().snapshot())
    expect(readings.altitudeFt).toBe(2000)
    expect(readings.airspeedKt).toBe(117)
    expect(readings.throttlePercent).toBe(35)
    expect(readings.headingDeg).toBeGreaterThan(160)
    expect(readings.headingDeg).toBeLessThan(180)
    expect(readings.latitudeDeg).toBeCloseTo(61.1151)
    expect(readings.longitudeDeg).toBeCloseTo(10.4641)
  })

  it('converts height above ground to feet, or leaves it unknown', () => {
    const session = createFlightSession()
    expect(readCockpit(session.snapshot()).aboveGroundFt).toBeUndefined()
    session.groundSampled(session.snapshot().flight.height - 100)
    expect(readCockpit(session.snapshot()).aboveGroundFt).toBe(328)
  })
})
