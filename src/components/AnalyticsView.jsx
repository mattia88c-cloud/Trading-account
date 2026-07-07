import MetricsGrid from './MetricsGrid.jsx'
import BreakdownBars from './BreakdownBars.jsx'
import ColumnChart from './ColumnChart.jsx'
import HeatmapTable from './HeatmapTable.jsx'
import RankedList from './RankedList.jsx'
import IdealTradeCard from './IdealTradeCard.jsx'
import styles from './AnalyticsView.module.css'

// In the compact (summary) view, pick the chart type best suited to each data shape:
// small fixed comparisons -> columns, multi-attribute categories -> heatmap table,
// open-ended/rankable lists -> ranked list. Per-account cards keep the simple bar rows.
function Breakdown({ kind, compact, ...props }) {
  if (!compact) return <BreakdownBars {...props} />
  if (kind === 'columns') return <ColumnChart {...props} />
  if (kind === 'table') return <HeatmapTable {...props} />
  if (kind === 'ranked') return <RankedList {...props} />
  return <BreakdownBars {...props} />
}

function fmt(n, digits = 2) {
  if (n === null || n === undefined) return '—'
  if (n === Infinity) return '∞'
  return n.toLocaleString('it-IT', { maximumFractionDigits: digits })
}

function fmtSigned(n) {
  if (n === null || n === undefined) return '—'
  return `${n >= 0 ? '+' : ''}${fmt(n)}`
}

function fmtDuration(min) {
  if (min === null || min === undefined) return '—'
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}h ${m}m`
}

const SIDE_LABELS = { long: 'Long', short: 'Short', misto: 'Misto' }
const WEEKDAY_ORDER = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function StatsBlock({ stats, compact }) {
  const monthEntries = Object.entries(stats.byMonth).sort((a, b) => a[0].localeCompare(b[0]))
  const weekdayEntries = WEEKDAY_ORDER.filter((w) => stats.byWeekday[w]).map((w) => [w, stats.byWeekday[w]])
  const sideEntries = Object.entries(stats.bySide).map(([k, v]) => [SIDE_LABELS[k] || k, v])
  const marketEntries = Object.entries(stats.byMarket)
  const sessionEntries = Object.entries(stats.byOpenSession)
  const newsEntries = Object.entries(stats.byNews)
  const strategyEntries = Object.entries(stats.byStrategy)
  const closeTypeEntries = Object.entries(stats.byCloseType)
  const gradeEntries = ['A', 'B', 'C', 'D'].filter((g) => stats.byGrade[g]).map((g) => [g, stats.byGrade[g]])
  const emotionalStateEntries = Object.entries(stats.byEmotionalState)
  const tagEntries = Object.entries(stats.byTag).sort((a, b) => b[1].days - a[1].days)
  const mods = stats.modifications
  const payouts = stats.payouts

  const kpis = [
    { label: 'Saldo attuale', value: `$${fmt(stats.currentBalance)}` },
    { label: 'P/L totale', value: fmtSigned(stats.totalPnl), tone: stats.totalPnl >= 0 ? 'positive' : 'negative' },
    { label: 'Crescita', value: `${stats.growthPct >= 0 ? '+' : ''}${stats.growthPct.toFixed(2)}%`, tone: stats.growthPct >= 0 ? 'positive' : 'negative' },
    { label: 'Win rate', value: `${stats.winRate.toFixed(1)}%` },
    { label: 'Giorni tradati', value: stats.daysTraded, sub: `${stats.winningDays}W / ${stats.losingDays}L` },
    { label: 'Trade (aperti/eff.)', value: `${stats.totalTradesOpened}/${stats.totalTradesEffective}` },
    { label: 'Freq. media trade/g', value: stats.avgTradeFrequency.toFixed(2) },
    { label: 'Expectancy', value: fmtSigned(stats.expectancy), tone: stats.expectancy >= 0 ? 'positive' : 'negative' },
    { label: 'Profit factor', value: fmt(stats.profitFactor), tone: stats.profitFactor >= 1 ? 'positive' : 'negative' },
    { label: 'R:R medio', value: stats.avgRiskReward !== null ? stats.avgRiskReward.toFixed(2) : '—' },
    { label: 'Rischio medio (% conto)', value: stats.avgRiskPct !== null ? `${stats.avgRiskPct.toFixed(2)}%` : '—' },
    { label: 'Fiducia media', value: stats.avgConfidence !== null ? `${stats.avgConfidence.toFixed(1)}/10` : '—' },
  ]

  return (
    <>
      <MetricsGrid metrics={kpis} />

      <div className={styles.winLoseGrid}>
        <div className={styles.winBox}>
          <div className={styles.winLoseTitle}>Winners</div>
          <div className={styles.miniRow}><span>Totale</span><span>{stats.winners.total}</span></div>
          <div className={styles.miniRow}><span>Best win</span><span>{fmtSigned(stats.winners.best)}</span></div>
          <div className={styles.miniRow}><span>Media</span><span>{fmtSigned(stats.winners.average)}</span></div>
          <div className={styles.miniRow}><span>Durata media</span><span>{fmtDuration(stats.winners.avgDuration)}</span></div>
          <div className={styles.miniRow}><span>Streak max/media</span><span>{stats.winners.maxStreak} / {stats.winners.avgStreak.toFixed(1)}</span></div>
        </div>
        <div className={styles.loseBox}>
          <div className={styles.winLoseTitle}>Losers</div>
          <div className={styles.miniRow}><span>Totale</span><span>{stats.losers.total}</span></div>
          <div className={styles.miniRow}><span>Best loss</span><span>{fmtSigned(stats.losers.best)}</span></div>
          <div className={styles.miniRow}><span>Media</span><span>{fmtSigned(stats.losers.average)}</span></div>
          <div className={styles.miniRow}><span>Durata media</span><span>{fmtDuration(stats.losers.avgDuration)}</span></div>
          <div className={styles.miniRow}><span>Streak max/media</span><span>{stats.losers.maxStreak} / {stats.losers.avgStreak.toFixed(1)}</span></div>
        </div>
      </div>

      {payouts.count > 0 && (
        <div className={styles.payoutBlock}>
          <div className={styles.payoutTitle}>Payout</div>
          <div className={styles.miniRow}><span>Totale prelevato</span><span>${fmt(payouts.total)}</span></div>
          <div className={styles.miniRow}><span>Numero payout</span><span>{payouts.count}</span></div>
          <div className={styles.miniRow}><span>Media per payout</span><span>${fmt(payouts.total / payouts.count)}</span></div>
          <div className={styles.payoutList}>
            {payouts.list.slice(0, 5).map((p) => (
              <div key={p.id} className={styles.payoutListRow}>
                <span>{p.date}</span>
                <span>${fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <BreakdownWrap compact={compact}>
        <Breakdown kind="ranked" title="Performance by market" entries={marketEntries} compact={compact} />
        <Breakdown kind="ranked" title="Performance by session" entries={sessionEntries} compact={compact} />
        <Breakdown kind="ranked" title="Performance con/senza notizie" entries={newsEntries} compact={compact} />
        <Breakdown kind="ranked" title="Aderenza alla strategia" entries={strategyEntries} compact={compact} />
        <Breakdown kind="table" title="Performance by close type" entries={closeTypeEntries} compact={compact} />
        <Breakdown kind="table" title="Performance by grade" entries={gradeEntries} compact={compact} />
        <Breakdown kind="ranked" title="Performance by stato emotivo" entries={emotionalStateEntries} compact={compact} />
        <Breakdown kind="ranked" title="Performance by tag" entries={tagEntries} formatLabel={(k) => `#${k}`} compact={compact} />
        <Breakdown kind="ranked" title="Performance by side" entries={sideEntries} compact={compact} />
        <Breakdown kind="ranked" title="Performance by day" entries={weekdayEntries} compact={compact} />
        <Breakdown kind="ranked" title="Performance by month" entries={monthEntries} compact={compact} />

        {(mods.reEntry.count > 0 || mods.stopWidened.count > 0 || mods.lotIncreased.count > 0) && (
          <Breakdown
            kind="ranked"
            title="Modifiche al trade"
            compact={compact}
            entries={[
              mods.reEntry.count > 0 ? ['Re-entry', mods.reEntry] : null,
              mods.stopWidened.count > 0 ? ['Stop allungato', mods.stopWidened] : null,
              mods.lotIncreased.count > 0 ? ['Lottaggio aumentato', mods.lotIncreased] : null,
            ].filter(Boolean).map(([k, v]) => [k, { pnl: v.pnl, days: v.count, winRate: (v.wins / v.count) * 100 }])}
          />
        )}
      </BreakdownWrap>
    </>
  )
}

function BreakdownWrap({ compact, children }) {
  if (!compact) return <>{children}</>
  return <div className={styles.breakdownGrid}>{children}</div>
}

function NotesList({ entries, accountId }) {
  const notes = entries
    .filter((e) => (accountId ? e.accountId === accountId : true) && (e.mistake || e.whatWentWell || e.lesson))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  if (notes.length === 0) return null

  return (
    <div className={styles.notesBlock}>
      <div className={styles.notesTitle}>Note e lezioni recenti</div>
      {notes.map((e) => (
        <div key={e.id} className={styles.noteBlock}>
          <div className={styles.noteDate}>{e.date}</div>
          {e.mistake && <div className={styles.noteLine}><span className={styles.noteLabel}>Errore:</span> {e.mistake}</div>}
          {e.whatWentWell && <div className={styles.noteLine}><span className={styles.noteLabel}>Fatto bene:</span> {e.whatWentWell}</div>}
          {e.lesson && <div className={styles.noteLine}><span className={styles.noteLabel}>Lezione:</span> {e.lesson}</div>}
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsView({ accounts, entries, getAnalytics, getSummaryAnalytics }) {
  if (accounts.length === 0) {
    return <p className={styles.empty}>Crea un conto per vedere le statistiche.</p>
  }

  const summaryStats = getSummaryAnalytics(accounts.map((a) => a.id))
  const accountIds = accounts.map((a) => a.id)
  const relevantEntries = entries.filter((e) => accountIds.includes(e.accountId))

  return (
    <div className={styles.wrap}>
      <div className={styles.card} style={{ borderLeftColor: 'var(--accent)' }}>
        <div className={styles.header}>
          Riepilogo ({summaryStats.accountCount} cont{summaryStats.accountCount === 1 ? 'o' : 'i'})
        </div>
        <StatsBlock stats={summaryStats} compact />
        <div className={styles.notesIdealGrid}>
          <NotesList entries={relevantEntries} />
          <IdealTradeCard stats={summaryStats} />
        </div>
      </div>

      <div className={styles.grid}>
        {accounts.map((account) => {
          const stats = getAnalytics(account.id)
          return (
            <div
              key={account.id}
              className={`${styles.card} ${!account.active ? styles.cardInactive : ''}`}
              style={{ borderLeftColor: !account.active ? '#e74c3c' : account.color }}
            >
              <div className={styles.header}>
                <span className={styles.dot} style={{ background: account.color }} />
                {account.name}
                {!account.active && <span className={styles.inactiveTag}>Disattivato</span>}
              </div>
              <StatsBlock stats={stats} />
              <NotesList entries={entries} accountId={account.id} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
