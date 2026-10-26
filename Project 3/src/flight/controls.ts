import { useCallback, useEffect, useRef, useState } from 'react'
import type { FlightInput } from './physics'

export interface ControlKey {
  /** KeyboardEvent.code */
  code: string
  /** What the legend shows on the key cap. */
  glyph: string
}

export interface ControlGroup {
  label: string
  keys: ControlKey[]
}

interface AxisKey extends ControlKey {
  direction: 1 | -1
}

// Keys are listed in legend order.
const AXES: { axis: keyof FlightInput; label: string; keys: AxisKey[] }[] = [
  {
    axis: 'throttle',
    label: 'Throttle',
    keys: [
      { code: 'KeyW', glyph: 'W', direction: 1 },
      { code: 'KeyS', glyph: 'S', direction: -1 },
    ],
  },
  {
    // Stick convention: push forward (↑) to dive, pull back (↓) to climb.
    axis: 'pitch',
    label: 'Pitch',
    keys: [
      { code: 'ArrowDown', glyph: '↓', direction: 1 },
      { code: 'ArrowUp', glyph: '↑', direction: -1 },
    ],
  },
  {
    axis: 'roll',
    label: 'Roll',
    keys: [
      { code: 'ArrowLeft', glyph: '←', direction: -1 },
      { code: 'ArrowRight', glyph: '→', direction: 1 },
    ],
  },
]

const RESET_KEY: ControlKey = { code: 'KeyR', glyph: 'R' }

export const CONTROL_LEGEND: ControlGroup[] = [
  ...AXES.map(({ label, keys }) => ({ label, keys })),
  { label: 'Restart', keys: [RESET_KEY] },
]

const CONTROL_CODES = new Set(CONTROL_LEGEND.flatMap(({ keys }) => keys.map(({ code }) => code)))

/** Flight input from the set of held key codes; opposing keys cancel out. */
export function inputFromKeys(keys: ReadonlySet<string>): FlightInput {
  const input: FlightInput = { throttle: 0, pitch: 0, roll: 0 }
  for (const { axis, keys: axisKeys } of AXES) {
    for (const { code, direction } of axisKeys) {
      if (keys.has(code)) input[axis] += direction
    }
  }
  return input
}

/**
 * Tracks the flight keys on the window. `readInput` is stable and cheap enough
 * to call every frame; `pressed` re-renders the legend. `onReset` fires once
 * per press of the restart key.
 */
export function useFlightControls(onReset: () => void) {
  const keysRef = useRef(new Set<string>())
  const onResetRef = useRef(onReset)
  const [pressed, setPressed] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    onResetRef.current = onReset
  }, [onReset])

  useEffect(() => {
    const keys = keysRef.current
    const sync = () => setPressed(new Set(keys))
    const onKeyDown = (event: KeyboardEvent) => {
      if (!CONTROL_CODES.has(event.code)) return
      event.preventDefault()
      if (event.code === RESET_KEY.code && !event.repeat) onResetRef.current()
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

  const readInput = useCallback(() => inputFromKeys(keysRef.current), [])

  return { readInput, pressed }
}
