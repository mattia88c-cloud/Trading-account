import styles from './ThemeToggle.module.css'

const icon = {
  width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round',
}

const SunIcon = (
  <svg {...icon}>
    <circle cx="12" cy="12" r="4.2" />
    <line x1="12" y1="1.5" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22.5" />
    <line x1="3.9" y1="3.9" x2="5.6" y2="5.6" />
    <line x1="18.4" y1="18.4" x2="20.1" y2="20.1" />
    <line x1="1.5" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22.5" y2="12" />
    <line x1="3.9" y1="20.1" x2="5.6" y2="18.4" />
    <line x1="18.4" y1="5.6" x2="20.1" y2="3.9" />
  </svg>
)

const MoonIcon = (
  <svg {...icon} fill="currentColor" stroke="none">
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
  </svg>
)

export default function ThemeToggle({ theme, onChange }) {
  const isLight = theme === 'light'
  return (
    <button
      type="button"
      className={styles.switch}
      data-theme={theme}
      onClick={() => onChange(isLight ? 'dark' : 'light')}
      role="switch"
      aria-checked={isLight}
      aria-label={isLight ? 'Passa al tema notte' : 'Passa al tema giorno'}
      title={isLight ? 'Giorno' : 'Notte'}
    >
      <span className={styles.starA} />
      <span className={styles.starB} />
      <span className={styles.starC} />
      <span className={styles.thumb}>{isLight ? SunIcon : MoonIcon}</span>
    </button>
  )
}
