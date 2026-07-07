import MetricsGrid from './MetricsGrid.jsx'
import BreakdownBars from './BreakdownBars.jsx'
import styles from './WeeklyReview.module.css'

const SIDE_LABELS = { long: 'Long', short: 'Short', misto: 'Misto' }

function fmt(n, digits = 2) {
  if (n === null || n === undefined) return '—'
  if (n === Infinity) return '∞'
  return n.toLocaleString('it-IT', { maximumFractionDigits: digits })
}

function fmtSigned(n) {
  if (n === null || n === undefined) return '—'
  return `${n >= 0 ? '+' : ''}${fmt(n)}`
}

export default function WeeklyReview({ accounts, getWeeklyAnalytics }) {
  if (accounts.length === 0) {
    return <p className={styles.empty}>Crea un conto per vedere la review settimanale.</p>
  }

  const weeks = getWeeklyAnalytics(accounts.map((a) => a.id))

  if (weeks.length === 0) {
    return <p className={styles.empty}>Nessuna giornata registrata ancora.</p>
  }

  return (
    <div className={styles.list}>
      {weeks.map(({ weekStart, weekEnd, stats }) => {
        const sideEntries = Object.entries(stats.bySide).map(([k, v]) => [SIDE_LABELS[k] || k, v])
        const gradeEntries = ['A', 'B', 'C', 'D'].filter((g) => stats.byGrade[g]).map((g) => [g, stats.byGrade[g]])
        const payouts = stats.payouts

        const kpis = [
          { label: 'Win rate', value: `${stats.winRate.toFixed(1)}%` },
          { label: 'Profit factor', value: fmt(stats.profitFactor) },
          { label: 'R:R medio', value: stats.avgRiskReward !== null ? stats.avgRiskReward.toFixed(2) : '—' },
          { label: 'Giorni tradati', value: stats.daysTraded, sub: `${stats.winningDays}W / ${stats.losingDays}L` },
          { label: 'Miglior giorno', value: stats.bestDay ? fmtSigned(stats.bestDay.profit) : '—', tone: 'positive', sub: stats.bestDay?.date },
          { label: 'Peggior giorno', value: stats.worstDay ? fmtSigned(stats.worstDay.profit) : '—', tone: 'negative', sub: stats.worstDay?.date },
        ]

        return (
          <div key={weekStart} className={styles.card}>
            <div className={styles.header}>
              Settimana {weekStart} → {weekEnd}
              <span className={stats.totalPnl >= 0 ? styles.positive : styles.negative}>
                {fmtSigned(stats.totalPnl)}
              </span>
            </div>

            <MetricsGrid metrics={kpis} />

            {payouts.count > 0 && (
              <div className={styles.payoutBlock}>
                <span className={styles.payoutLabel}>Payout questa settimana:</span>
                <span className={styles.payoutValue}>${fmt(payouts.total)} ({payouts.count})</span>
              </div>
            )}

            <BreakdownBars title="Long vs Short" entries={sideEntries} />
            <BreakdownBars title="Distribuzione voti A/B/C/D" entries={gradeEntries} />
          </div>
        )
      })}
    </div>
  )
}
