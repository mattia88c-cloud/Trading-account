import styles from './RankedList.module.css'

export default function RankedList({ title, entries, formatLabel, limit = 8 }) {
  if (!entries || entries.length === 0) return null

  const sorted = [...entries].sort((a, b) => b[1].pnl - a[1].pnl).slice(0, limit)
  const maxAbs = Math.max(...sorted.map(([, v]) => Math.abs(v.pnl)), 1)

  return (
    <div className={styles.block}>
      <div className={styles.title}>{title}</div>
      {sorted.map(([key, v], i) => {
        const isPositive = v.pnl >= 0
        const widthPct = Math.max((Math.abs(v.pnl) / maxAbs) * 100, 6)
        return (
          <div key={key} className={styles.row}>
            <span className={styles.rank}>{i + 1}</span>
            <span className={styles.label}>{formatLabel ? formatLabel(key) : key}</span>
            <span className={styles.meta}>{v.days}g{v.winRate !== undefined ? ` · ${v.winRate.toFixed(0)}%` : ''}</span>
            <div className={styles.track}>
              <div
                className={isPositive ? styles.fillPositive : styles.fillNegative}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className={isPositive ? styles.valuePositive : styles.valueNegative}>
              {isPositive ? '+' : ''}{v.pnl.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
