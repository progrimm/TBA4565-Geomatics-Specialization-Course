import { describe, expect, it } from 'vitest'
import { initialFlightState, type FlightInput } from '../src/flight/physics'
import { createFlightSession } from '../src/flight/session'

const LEVEL: FlightInput = { throttle: 0, pitch: 0, roll: 0 }

describe('flight session', () => {
  it('starts at the initial flight state with no ground sample', () => {
    const { flight, aboveGround, groundContact, track } = createFlightSession().snapshot()
    expect(flight).toEqual(initialFlightState())
    expect(aboveGround).toBeUndefined()
    expect(groundContact).toBe(false)
    expect(track).toHaveLength(1)
    expect(track[0]).toHaveLength(1)
  })

  it('caps a long frame at 0.1 s', () => {
    const capped = createFlightSession()
    const stepped = createFlightSession()
    capped.tick(LEVEL, 5)
    stepped.tick(LEVEL, 0.1)
    expect(capped.snapshot().flight).toEqual(stepped.snapshot().flight)
  })

  it('reports height above the sampled ground', () => {
    const session = createFlightSession()
    const { height } = session.snapshot().flight
    session.groundSampled(height - 500)
    expect(session.snapshot().aboveGround).toBeCloseTo(500)
    expect(session.snapshot().groundContact).toBe(false)
  })

  it('lifts the broom clear of ground it has sunk into and levels a dive', () => {
    const session = createFlightSession()
    session.tick({ throttle: 0, pitch: -1, roll: 0 }, 0.1)
    const { height } = session.snapshot().flight
    session.groundSampled(height + 10)
    const { flight, groundContact } = session.snapshot()
    expect(groundContact).toBe(true)
    expect(flight.height).toBeCloseTo(height + 13)
    expect(flight.pitch).toBe(0)
  })

  it('ignores a ground sample far above the broom as a coarse tile', () => {
    const session = createFlightSession()
    const { height } = session.snapshot().flight
    session.groundSampled(height + 300)
    expect(session.snapshot().aboveGround).toBeUndefined()
    expect(session.snapshot().groundContact).toBe(false)
    expect(session.snapshot().flight.height).toBe(height)
  })

  it('forgets the ground when it cannot be sampled', () => {
    const session = createFlightSession()
    session.groundSampled(session.snapshot().flight.height - 100)
    session.groundSampled(undefined)
    expect(session.snapshot().aboveGround).toBeUndefined()
  })

  it('records track points at least 25 m apart', () => {
    const session = createFlightSession()
    // 60 m/s: 0.1 s is 6 m, so a point every fifth tick or so.
    for (let i = 0; i < 50; i++) session.tick(LEVEL, 0.1)
    const [segment] = session.snapshot().track
    expect(segment.length).toBeGreaterThan(5)
    expect(segment.length).toBeLessThan(15)
  })

  it('keeps the same track array until a point is added', () => {
    const session = createFlightSession()
    const before = session.snapshot().track
    session.tick(LEVEL, 0.01)
    expect(session.snapshot().track).toBe(before)
  })

  it('restarts at the initial state on a new track segment', () => {
    const session = createFlightSession()
    for (let i = 0; i < 20; i++) session.tick({ throttle: 1, pitch: 1, roll: 1 }, 0.1)
    session.groundSampled(0)
    session.reset()
    const { flight, aboveGround, track } = session.snapshot()
    expect(flight).toEqual(initialFlightState())
    expect(aboveGround).toBeUndefined()
    expect(track).toHaveLength(2)
    expect(track[1]).toHaveLength(1)
  })
})
