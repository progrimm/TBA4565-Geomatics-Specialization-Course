import { describe, expect, it } from 'vitest'
import { CONTROL_LEGEND, inputFromKeys } from '../src/flight/controls'

describe('flight controls', () => {
  it('is level with no keys held', () => {
    expect(inputFromKeys(new Set())).toEqual({ throttle: 0, pitch: 0, roll: 0 })
  })

  it('maps keys to axes with stick convention for pitch', () => {
    expect(inputFromKeys(new Set(['KeyW', 'ArrowUp', 'ArrowLeft']))).toEqual({
      throttle: 1,
      pitch: -1,
      roll: -1,
    })
    expect(inputFromKeys(new Set(['KeyS', 'ArrowDown', 'ArrowRight']))).toEqual({
      throttle: -1,
      pitch: 1,
      roll: 1,
    })
  })

  it('cancels opposing keys', () => {
    expect(inputFromKeys(new Set(['ArrowLeft', 'ArrowRight'])).roll).toBe(0)
  })

  it('lists every bound key in the legend once', () => {
    const codes = CONTROL_LEGEND.flatMap(({ keys }) => keys.map(({ code }) => code))
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes).toEqual(
      expect.arrayContaining(['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyR']),
    )
  })
})
