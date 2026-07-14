import { useCollapsed } from '../useCollapsed.js'
import CollapseToggle from './CollapseToggle.jsx'
import styles from './HeatmapTable.module.css'

export default function HeatmapTable({ title, entries, formatLabel, boxKey }) {
  const [open, toggle] = useCollapsed(boxKey || title)
  if (!entries || entries.length === 0) return null

  const maxAbs = Math.max(...entries.map(([, v]) => Math.abs(v.pnl)), 1)

  return (
    <div className={styles.block}>
      <div className={styles.title}>
        <span>{title}</span>
        <CollapseToggle open={open} onToggle={toggle} />
      </div>
      {open && <table className={styles.table}>
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Giorni</th>
            <th>Win%</th>
            <th>P/L</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, v]) => {
            const intensity = Math.min(Math.abs(v.pnl) / maxAbs, 1)
            const isPositive = v.pnl >= 0
            const bg = isPositive
              ? `rgba(46, 204, 113, ${0.12 + intensity * 0.45})`
              : `rgba(231, 76, 60, ${0.12 + intensity * 0.45})`
            return (
              <tr key={key}>
                <td className={styles.labelCell}>{formatLabel ? formatLabel(key) : key}</td>
                <td className={styles.metaCell}>{v.days}</td>
                <td className={styles.metaCell}>{v.winRate !== undefined ? `${v.winRate.toFixed(0)}%` : '—'}</td>
                <td className={styles.pnlCell} style={{ background: bg }}>
                  {isPositive ? '+' : ''}{v.pnl.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>}
    </div>
  )
}
