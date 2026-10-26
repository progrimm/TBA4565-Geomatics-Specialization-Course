import { useMemo, useReducer } from 'react'
import { landmarks, type Landmark } from './landmarks'

export type TourMove = { type: 'next' } | { type: 'previous' } | { type: 'select'; id: string }

/** Landmark index after `move`. Next and previous wrap around; unknown ids stay put. */
export function moveTour(index: number, move: TourMove): number {
  const count = landmarks.length
  switch (move.type) {
    case 'next':
      return (index + 1) % count
    case 'previous':
      return (index - 1 + count) % count
    case 'select': {
      const selected = landmarks.findIndex((landmark) => landmark.id === move.id)
      return selected === -1 ? index : selected
    }
  }
}

export interface TourPosition {
  index: number
  landmark: Landmark
  next(): void
  previous(): void
  select(id: string): void
}

/** Where the tour is. The callbacks are stable across renders. */
export function useTourPosition(): TourPosition {
  const [index, dispatch] = useReducer(moveTour, 0)
  const moves = useMemo(
    () => ({
      next: () => dispatch({ type: 'next' }),
      previous: () => dispatch({ type: 'previous' }),
      select: (id: string) => dispatch({ type: 'select', id }),
    }),
    [],
  )
  return { index, landmark: landmarks[index], ...moves }
}
