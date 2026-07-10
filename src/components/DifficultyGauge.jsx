import styles from './DifficultyGauge.module.css'

// Di default alto = peggio (usato per le difficoltà challenge/payout del Prop Firm Finder).
// Con invert=true alto = meglio (usato per score dove un valore alto è un bene, es. disciplina).
function colorFor(score, invert) {
  const v = invert ? 100 - score : score
  if (v < 40) return 'var(--green)'
  if (v < 70) return 'var(--amber)'
  return 'var(--red)'
}

export default function DifficultyGauge({ score, label, compact = false, invert = false }) {
  const pct = clamp(score)
  const color = colorFor(pct, invert)
  return (
    <div className={compact ? styles.compactWrap : styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={compact ? styles.compactTrack : styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={styles.value} style={{ color }}>{pct}</span>
    </div>
  )
}

function clamp(v) {
  const n = Number(v) || 0
  return Math.max(0, Math.min(100, n))
}
