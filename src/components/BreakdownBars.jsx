import { useCollapsed } from '../useCollapsed.js'
import CollapseToggle from './CollapseToggle.jsx'
import styles from './BreakdownBars.module.css'

export default function BreakdownBars({ title, entries, formatLabel, compact, boxKey, hideMoney }) {
  const [open, toggle] = useCollapsed(boxKey || title)
  if (!entries || entries.length === 0) return null

  const maxAbs = Math.max(...entries.map(([, v]) => Math.abs(v.pnl)), 1)

  return (
    <div className={styles.block}>
      <div className={styles.title}>
        <span>{title}</span>
        <CollapseToggle open={open} onToggle={toggle} />
      </div>
      {open && <div className={compact ? styles.rowsGrid : undefined}>
      {entries.map(([key, v]) => {
        const isPositive = hideMoney ? (v.winRate === undefined || v.winRate >= 50) : v.pnl >= 0
        const widthPct = hideMoney
          ? Math.max((v.winRate !== undefined ? v.winRate : 50), 3)
          : Math.max((Math.abs(v.pnl) / maxAbs) * 100, 3)
        return (
          <div key={key} className={styles.row}>
            <div className={styles.rowHeader}>
              <span className={styles.label}>{formatLabel ? formatLabel(key) : key}</span>
              <span className={styles.meta}>{v.days} trade{v.winRate !== undefined ? ` · ${v.winRate.toFixed(0)}% win` : ''}</span>
              {!hideMoney && (
                <span className={isPositive ? styles.valuePositive : styles.valueNegative}>
                  {isPositive ? '+' : ''}{v.pnl.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
            <div className={styles.track}>
              <div
                className={isPositive ? styles.fillPositive : styles.fillNegative}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        )
      })}
      </div>}
    </div>
  )
}
