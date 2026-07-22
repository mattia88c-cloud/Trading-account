import { useState } from 'react'
import MetricsGrid from './MetricsGrid.jsx'
import BreakdownBars from './BreakdownBars.jsx'
import ColumnChart from './ColumnChart.jsx'
import HeatmapTable from './HeatmapTable.jsx'
import RankedList from './RankedList.jsx'
import IdealTradeCard from './IdealTradeCard.jsx'
import OvertradingImpact from './OvertradingImpact.jsx'
import RiskBudgetCard from './RiskBudgetCard.jsx'
import CollapseToggle from './CollapseToggle.jsx'
import { useCollapsed } from '../useCollapsed.js'
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

function StatsBlock({ stats, compact, entries, storageKey }) {
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
    { label: 'Trade', value: stats.totalTradesEffective },
    { label: 'Freq. media trade/g', value: stats.avgTradeFrequency.toFixed(2) },
    { label: 'Expectancy', value: fmtSigned(stats.expectancy), tone: stats.expectancy >= 0 ? 'positive' : 'negative' },
    { label: 'Profit factor', value: fmt(stats.profitFactor), tone: stats.profitFactor >= 1 ? 'positive' : 'negative' },
    { label: 'R:R medio', value: stats.avgRiskReward !== null ? stats.avgRiskReward.toFixed(2) : '—' },
    { label: 'Rischio medio (% conto)', value: stats.avgRiskPct !== null ? `${stats.avgRiskPct.toFixed(2)}%` : '—' },
    { label: 'Fiducia media', value: stats.avgConfidence !== null ? `${stats.avgConfidence.toFixed(1)}/10` : '—' },
  ]

  if (stats.disciplineCost.offPlanCount > 0) {
    kpis.push({
      label: 'TP mancati per indisciplina',
      value: `${stats.disciplineCost.missedTPCount}/${stats.disciplineCost.offPlanCount}`,
      sub: `${stats.disciplineCost.missedTPPct.toFixed(0)}% dei trade fuori piano · P/L reale in quei trade: ${fmtSigned(stats.disciplineCost.missedTPPnl)}`,
      tone: stats.disciplineCost.missedTPCount > 0 ? 'negative' : undefined,
    })
  }

  const [winOpen, toggleWin] = useCollapsed(`${storageKey}:winners`)
  const [loseOpen, toggleLose] = useCollapsed(`${storageKey}:losers`)
  const [payoutOpen, togglePayout] = useCollapsed(`${storageKey}:payout`)

  return (
    <>
      <MetricsGrid metrics={kpis} />

      <RiskBudgetCard entries={entries} initialBalance={stats.initialBalance} storageKey={storageKey} />

      <div className={styles.winLoseGrid}>
        <div className={styles.winBox}>
          <div className={styles.winLoseTitle}><span>Winners</span><CollapseToggle open={winOpen} onToggle={toggleWin} /></div>
          {winOpen && <>
            <div className={styles.miniRow}><span>Totale</span><span>{stats.winners.total}</span></div>
            <div className={styles.miniRow}><span>Best win</span><span>{fmtSigned(stats.winners.best)}</span></div>
            <div className={styles.miniRow}><span>Media</span><span>{fmtSigned(stats.winners.average)}</span></div>
            <div className={styles.miniRow}><span>Durata media</span><span>{fmtDuration(stats.winners.avgDuration)}</span></div>
            <div className={styles.miniRow}><span>Streak max/media</span><span>{stats.winners.maxStreak} / {stats.winners.avgStreak.toFixed(1)}</span></div>
          </>}
        </div>
        <div className={styles.loseBox}>
          <div className={styles.winLoseTitle}><span>Losers</span><CollapseToggle open={loseOpen} onToggle={toggleLose} /></div>
          {loseOpen && <>
            <div className={styles.miniRow}><span>Totale</span><span>{stats.losers.total}</span></div>
            <div className={styles.miniRow}><span>Best loss</span><span>{fmtSigned(stats.losers.best)}</span></div>
            <div className={styles.miniRow}><span>Media</span><span>{fmtSigned(stats.losers.average)}</span></div>
            <div className={styles.miniRow}><span>Durata media</span><span>{fmtDuration(stats.losers.avgDuration)}</span></div>
            <div className={styles.miniRow}><span>Streak max/media</span><span>{stats.losers.maxStreak} / {stats.losers.avgStreak.toFixed(1)}</span></div>
          </>}
        </div>
      </div>

      {payouts.count > 0 && (
        <div className={styles.payoutBlock}>
          <div className={styles.payoutTitle}><span>Payout</span><CollapseToggle open={payoutOpen} onToggle={togglePayout} /></div>
          {payoutOpen && <>
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
          </>}
        </div>
      )}

      <BreakdownWrap compact={compact}>
        <Breakdown kind="ranked" title="Performance by market" entries={marketEntries} compact={compact} boxKey={`${storageKey}:market`} />
        <Breakdown kind="ranked" title="Performance by session" entries={sessionEntries} compact={compact} boxKey={`${storageKey}:session`} />
        <Breakdown kind="ranked" title="Performance con/senza notizie" entries={newsEntries} compact={compact} boxKey={`${storageKey}:news`} />
        <Breakdown kind="ranked" title="Aderenza alla strategia" entries={strategyEntries} compact={compact} boxKey={`${storageKey}:strategy`} />
        <Breakdown kind="table" title="Performance by close type" entries={closeTypeEntries} compact={compact} boxKey={`${storageKey}:closeType`} />
        <Breakdown kind="table" title="Performance by grade" entries={gradeEntries} compact={compact} boxKey={`${storageKey}:grade`} />
        <Breakdown kind="ranked" title="Performance by stato emotivo" entries={emotionalStateEntries} compact={compact} boxKey={`${storageKey}:emotion`} />
        <Breakdown kind="ranked" title="Performance by tag" entries={tagEntries} formatLabel={(k) => `#${k}`} compact={compact} boxKey={`${storageKey}:tag`} />
        <Breakdown kind="ranked" title="Performance by side" entries={sideEntries} compact={compact} boxKey={`${storageKey}:side`} />
        <Breakdown kind="ranked" title="Performance by day" entries={weekdayEntries} compact={compact} boxKey={`${storageKey}:weekday`} />
        <Breakdown kind="ranked" title="Performance by month" entries={monthEntries} compact={compact} boxKey={`${storageKey}:month`} />

        {(mods.reEntry.count > 0 || mods.stopWidened.count > 0 || mods.lotIncreased.count > 0) && (
          <Breakdown
            kind="ranked"
            title="Modifiche al trade"
            compact={compact}
            boxKey={`${storageKey}:mods`}
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

function NotesList({ entries, accountId, storageKey }) {
  const [open, toggle] = useCollapsed(`${storageKey}:notes`)
  const filtered = entries.filter((e) => (accountId ? e.accountId === accountId : true) && (e.mistake || e.whatWentWell || e.lesson))
  // In modalità aggregata (accountId non passato) un giorno in copy trading ha un'entry per
  // conto sulla stessa data con la stessa nota (stesso salvataggio del Journal trade): senza
  // deduplicare per data la stessa nota comparirebbe una volta per conto invece che una sola.
  const seenDates = new Set()
  const notes = filtered
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((e) => {
      if (seenDates.has(e.date)) return false
      seenDates.add(e.date)
      return true
    })
    .slice(0, 5)

  if (notes.length === 0) return null

  return (
    <div className={styles.notesBlock}>
      <div className={styles.notesTitle}><span>Note e lezioni recenti</span><CollapseToggle open={open} onToggle={toggle} /></div>
      {open && notes.map((e) => (
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

function CollapsibleCard({ storageKey, className, style, headerContent, children }) {
  const [open, toggle] = useCollapsed(`${storageKey}:card`)
  return (
    <div className={className} style={style}>
      <div className={styles.header}>
        {headerContent}
        <CollapseToggle open={open} onToggle={toggle} />
      </div>
      {open && children}
    </div>
  )
}

function AccountAnalyticsCard({ account, stats, entries }) {
  return (
    <CollapsibleCard
      storageKey={account.id}
      className={`${styles.card} ${!account.active ? styles.cardInactive : ''}`}
      style={{ borderLeftColor: !account.active ? 'var(--red)' : account.color }}
      headerContent={(
        <>
          <span className={styles.dot} style={{ background: account.color }} />
          {account.name}
          {!account.active && <span className={styles.inactiveTag}>Disattivato</span>}
        </>
      )}
    >
      <StatsBlock stats={stats} entries={entries.filter((e) => e.accountId === account.id)} storageKey={account.id} />
      <NotesList entries={entries} accountId={account.id} storageKey={account.id} />
    </CollapsibleCard>
  )
}

export default function AnalyticsView({
  accounts, entries, getAnalytics, getSummaryAnalytics, getOvertradingAnalytics, getAccountBalance, getThreshold,
}) {
  if (accounts.length === 0) {
    return <p className={styles.empty}>Crea un conto per vedere le statistiche.</p>
  }

  const [summaryActiveOnly, setSummaryActiveOnly] = useState(true)
  // Di default i trade con re-entry (non da programma) sono esclusi dal Riepilogo: rappresentano
  // trade che "non avresti dovuto fare", quindi non devono incidere sull'analisi a meno che tu
  // non li includa esplicitamente cliccando il pulsante.
  const [excludeReEntry, setExcludeReEntry] = useState(true)
  const accountIds = accounts.map((a) => a.id)
  const overtradingData = getOvertradingAnalytics(accountIds)

  // Il Riepilogo aggregato ha un filtro suo, indipendente dalla checkbox "Mostra conti
  // disattivati" in cima alla pagina (quella controlla cos'altro è visibile, es. le card per
  // conto e Margine dal threshold): di default somma solo i conti attivi, cosi un conto vecchio
  // disattivato non gonfia le statistiche "correnti" a meno che non lo richieda esplicitamente.
  const summaryAccounts = summaryActiveOnly ? accounts.filter((a) => a.active) : accounts
  const summaryAccountIds = summaryAccounts.map((a) => a.id)
  const summaryStats = getSummaryAnalytics(summaryAccountIds, { excludeReEntry })
  const relevantEntries = entries
    .filter((e) => summaryAccountIds.includes(e.accountId))
    .filter((e) => !excludeReEntry || !e.reEntry)

  // Margine residuo prima del threshold (drawdown massimo) di ogni conto: quanto puoi ancora
  // perdere, in totale e conto per conto, prima di bruciare qualcosa. Conti già bruciati non
  // hanno margine (0), non un numero negativo che confonderebbe la somma.
  const thresholdRows = accounts.map((account) => {
    const threshold = getThreshold(account.id)
    const balance = getAccountBalance(account.id)
    const distance = threshold ? Math.max(0, balance - threshold.threshold) : null
    return { account, threshold, distance }
  })
  const totalThresholdDistance = thresholdRows.reduce((sum, r) => sum + (r.distance || 0), 0)

  return (
    <div className={styles.wrap}>
      <OvertradingImpact data={overtradingData} />

      <CollapsibleCard storageKey="threshold" className={styles.card} style={{ borderLeftColor: 'var(--accent)' }} headerContent="Margine dal threshold">
        <div className={styles.thresholdTotal}>
          ${totalThresholdDistance.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
        </div>
        <p className={styles.thresholdSub}>quanto puoi ancora perdere in totale prima di bruciare un conto</p>
        <div className={styles.thresholdList}>
          {thresholdRows.map(({ account, threshold, distance }) => (
            <div key={account.id} className={styles.thresholdRow}>
              <span className={styles.thresholdName}>
                <span className={styles.dot} style={{ background: account.color }} />
                {account.name}
              </span>
              <span className={threshold?.breached ? styles.thresholdBreachedTag : styles.thresholdValue}>
                {threshold?.breached ? 'Bruciato' : distance !== null ? `$${distance.toLocaleString('it-IT', { maximumFractionDigits: 2 })}` : '—'}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      <button
        type="button"
        className={styles.summaryFilterBtn}
        onClick={() => setSummaryActiveOnly((v) => !v)}
      >
        {summaryActiveOnly ? '● Riepilogo: solo conti attivi' : '○ Riepilogo: tutti i conti mostrati'}
      </button>

      <button
        type="button"
        className={styles.summaryFilterBtn}
        onClick={() => setExcludeReEntry((v) => !v)}
      >
        {excludeReEntry ? '● Re-entry non da programma: esclusi' : '○ Re-entry non da programma: inclusi'}
      </button>

      <CollapsibleCard
        storageKey="summary"
        className={styles.card}
        style={{ borderLeftColor: 'var(--accent)' }}
        headerContent={`Riepilogo (${summaryStats.accountCount} cont${summaryStats.accountCount === 1 ? 'o' : 'i'})`}
      >
        <StatsBlock stats={summaryStats} entries={relevantEntries} storageKey="summary" compact />
        <div className={styles.notesIdealGrid}>
          <NotesList entries={relevantEntries} storageKey="summary" />
          <IdealTradeCard stats={summaryStats} storageKey="summary" />
        </div>
      </CollapsibleCard>

      <div className={styles.grid}>
        {accounts.map((account) => (
          <AccountAnalyticsCard key={account.id} account={account} stats={getAnalytics(account.id)} entries={entries} />
        ))}
      </div>
    </div>
  )
}
