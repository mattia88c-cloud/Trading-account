import styles from './HintsToggle.module.css'

const iconProps = {
  width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round',
}

const InfoIcon = (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16.5" />
    <circle cx="12" cy="7.5" r="0.4" fill="currentColor" stroke="none" />
  </svg>
)

export default function HintsToggle({ enabled, onToggle }) {
  return (
    <button
      type="button"
      className={styles.switch}
      data-on={enabled}
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? 'Nascondi suggerimenti e spiegazioni' : 'Mostra suggerimenti e spiegazioni'}
      title={enabled ? 'Suggerimenti attivi' : 'Suggerimenti disattivi'}
    >
      <span className={styles.thumb}>{InfoIcon}</span>
    </button>
  )
}
