import Card from './Card'
import MetricsGrid from './MetricsGrid.jsx'
import styles from './OvertradingImpact.module.css'

function fmt(n) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('it-IT', { maximumFractionDigits: 1 })
}

function fmtSigned(n) {
  if (n === null || n === undefined) return '—'
  return `${n >= 0 ? '+' : ''}${fmt(n)}`
}

export default function OvertradingImpact({ data }) {
  if (!data || data.count === 0) return null

  const metrics = [
    { label: 'Giornate di overtrading', value: data.count },
    { label: 'P&L totale in overtrading', value: `$${fmtSigned(data.totalPnl)}`, tone: data.totalPnl >= 0 ? 'positive' : 'negative' },
    { label: 'Media per overtrading day', value: `$${fmtSigned(data.avgPnl)}`, tone: data.avgPnl >= 0 ? 'positive' : 'negative' },
    { label: 'Trigger più frequente', value: data.mostFrequentTrigger || '—' },
    { label: 'Trade medio perdita controllo', value: data.avgLostControlAtTrade !== null ? `#${fmt(data.avgLostControlAtTrade)}` : '—' },
    { label: '% giornate rovinate', value: `${fmt(data.pctDaysRuined)}%` },
  ]

  const triggerEntries = Object.entries(data.triggerCounts).sort((a, b) => b[1] - a[1])
  const maxTriggerCount = Math.max(...triggerEntries.map(([, c]) => c), 1)

  return (
    <Card className={styles.card}>
      <div className={styles.title}>⚠ Impatto Overtrading</div>
      <MetricsGrid metrics={metrics} />

      <div className={styles.compareBlock}>
        <div className={styles.compareTitle}>Confronto giorni normali vs overtrading</div>
        <div className={styles.compareRow}>
          <span className={styles.compareLabel}>Giorni normali ({data.normalDaysCount})</span>
          <span className={data.normalAvgPnl >= 0 ? styles.pnlPositive : styles.pnlNegative}>
            media ${fmtSigned(data.normalAvgPnl)}/giorno
          </span>
        </div>
        <div className={styles.compareRow}>
          <span className={styles.compareLabel}>Giorni overtrading ({data.count})</span>
          <span className={data.avgPnl >= 0 ? styles.pnlPositive : styles.pnlNegative}>
            media ${fmtSigned(data.avgPnl)}/giorno
          </span>
        </div>
      </div>

      {triggerEntries.length > 0 && (
        <div className={styles.triggerBlock}>
          <div className={styles.compareTitle}>Trigger più frequenti</div>
          {triggerEntries.map(([trigger, c]) => (
            <div key={trigger} className={styles.triggerRow}>
              <span className={styles.triggerLabel}>{trigger}</span>
              <div className={styles.triggerTrack}>
                <div className={styles.triggerFill} style={{ width: `${(c / maxTriggerCount) * 100}%` }} />
              </div>
              <span className={styles.triggerCount}>{c}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
