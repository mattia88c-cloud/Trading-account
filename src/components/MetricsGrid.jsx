import styles from './MetricsGrid.module.css'

export default function MetricsGrid({ metrics }) {
  return (
    <div className={styles.grid}>
      {metrics.map((m) => (
        <div key={m.label} className={styles.tile}>
          <div className={styles.label}>{m.label}</div>
          <div className={m.tone === 'positive' ? styles.valuePositive : m.tone === 'negative' ? styles.valueNegative : styles.value}>
            {m.value}
          </div>
          {m.sub && <div className={styles.sub}>{m.sub}</div>}
        </div>
      ))}
    </div>
  )
}
