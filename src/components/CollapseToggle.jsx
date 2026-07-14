import styles from './CollapseToggle.module.css'

export default function CollapseToggle({ open, onToggle }) {
  return (
    <button
      type="button"
      className={styles.btn}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      aria-label={open ? 'Comprimi' : 'Espandi'}
      title={open ? 'Comprimi' : 'Espandi'}
    >
      <svg
        className={open ? styles.chevronOpen : styles.chevronClosed}
        width="12" height="12" viewBox="0 0 12 12" fill="none"
      >
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
