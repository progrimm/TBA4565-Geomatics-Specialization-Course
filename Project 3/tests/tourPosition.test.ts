import { describe, expect, it } from 'vitest'
import { landmarks } from '../src/landmarks'
import { moveTour } from '../src/tourPosition'

const last = landmarks.length - 1

describe('tour position', () => {
  it('steps forward and back', () => {
    expect(moveTour(0, { type: 'next' })).toBe(1)
    expect(moveTour(1, { type: 'previous' })).toBe(0)
  })

  it('wraps around at both ends', () => {
    expect(moveTour(last, { type: 'next' })).toBe(0)
    expect(moveTour(0, { type: 'previous' })).toBe(last)
  })

  it('selects a landmark by id', () => {
    expect(moveTour(0, { type: 'select', id: landmarks[last].id })).toBe(last)
  })

  it('stays put for an unknown id', () => {
    expect(moveTour(2, { type: 'select', id: 'not-a-landmark' })).toBe(2)
  })
})
