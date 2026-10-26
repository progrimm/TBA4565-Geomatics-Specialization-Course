import { useEffect } from 'react'
import './ModeSwitch.css'

export type Mode = 'tour' | 'flight'

const MODES: { value: Mode; label: string }[] = [
  { value: 'tour', label: 'Landmark tour' },
  { value: 'flight', label: 'Flight simulator' },
]

interface ModeSwitchProps {
  mode: Mode
  onChange: (mode: Mode) => void
}

/** Toggles between the landmark tour and the flight simulator (also with the M key). */
function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyM' || event.repeat) return
      onChange(mode === 'tour' ? 'flight' : 'tour')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, onChange])

  return (
    <div className="mode-switch" role="tablist" aria-label="Mode">
      {MODES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={mode === value}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
      <span className="mode-switch-hint">
        <kbd>M</kbd>
      </span>
    </div>
  )
}

export default ModeSwitch
