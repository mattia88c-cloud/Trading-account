import styles from './LandingActionButton.module.css'

export default function LandingActionButton({ icon, title, subtitle, tone = 'accent', onClick }) {
  return (
    <button type="button" className={`${styles.card} ${styles[tone]}`} onClick={onClick}>
      <span className={styles.iconWrap}>{icon}</span>
      <span className={styles.title}>{title}</span>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
    </button>
  )
}
