import type { Landmark } from './landmarks'
import './TourPanel.css'

interface TourPanelProps {
  landmarks: Landmark[]
  selectedIndex: number
  onSelect: (index: number) => void
}

function TourPanel({ landmarks, selectedIndex, onSelect }: TourPanelProps) {
  const landmark = landmarks[selectedIndex]
  const count = landmarks.length
  const goTo = (index: number) => onSelect((index + count) % count)

  return (
    <aside className="tour-panel" aria-label="Lillehammer landmark tour">
      <header className="tour-header">
        <span>Lillehammer tour</span>
        <span className="tour-counter">
          {selectedIndex + 1} of {count}
        </span>
      </header>

      <article className="tour-card" aria-live="polite">
        <p className="tour-category">{landmark.category}</p>
        <h1 className="tour-title">{landmark.name}</h1>
        <p className="tour-description">{landmark.description}</p>
        <dl className="tour-facts">
          {landmark.facts.map((fact) => (
            <div key={fact.label} className="tour-fact">
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </article>

      <nav className="tour-nav">
        <button type="button" onClick={() => goTo(selectedIndex - 1)}>
          &lt;&lt; Previous
        </button>
        <button type="button" onClick={() => goTo(selectedIndex + 1)}>
          Next &gt;&gt;
        </button>
      </nav>

      <ol className="tour-list">
        {landmarks.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              aria-current={index === selectedIndex ? 'step' : undefined}
              onClick={() => onSelect(index)}
            >
              {item.name}
            </button>
          </li>
        ))}
      </ol>
    </aside>
  )
}

export default TourPanel
