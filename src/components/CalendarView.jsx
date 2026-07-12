import { useMemo, useState } from 'react'
import { GRADES } from '../useTradingData'
import styles from './CalendarView.module.css'

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

const GRADE_CLASS = { A: 'gradeA', B: 'gradeB', C: 'gradeC', D: 'gradeD' }

function toDateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function totalDaysInYear(y) {
  return Math.round((new Date(y + 1, 0, 1) - new Date(y, 0, 1)) / 86400000)
}

function daysElapsedInYear(y) {
  const now = new Date()
  if (y < now.getFullYear()) return totalDaysInYear(y)
  if (y > now.getFullYear()) return 0
  return Math.floor((now - new Date(y, 0, 1)) / 86400000) + 1
}

export default function CalendarView({ accounts, entries }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [accountFilter, setAccountFilter] = useState('all')

  const accountById = useMemo(() => {
    const map = {}
    accounts.forEach((a) => { map[a.id] = a })
    return map
  }, [accounts])

  const statsByDay = useMemo(() => {
    const filtered = accountFilter === 'all' ? entries : entries.filter((e) => e.accountId === accountFilter)
    const map = {}
    filtered.forEach((e) => {
      if (!map[e.date]) {
        map[e.date] = {
          pnl: 0, tradesOpened: 0, tradesEffective: 0, overtrading: false,
          accountIds: new Set(), wins: 0, losses: 0, grades: [],
        }
      }
      const day = map[e.date]
      day.pnl += e.profit
      day.tradesOpened += e.tradesOpened || 0
      day.tradesEffective += e.tradesEffective
      if (e.overtradingDay) day.overtrading = true
      day.accountIds.add(e.accountId)
      if (e.outcome === 'Win') day.wins += 1
      if (e.outcome === 'Loss') day.losses += 1
      if (e.grade) day.grades.push(e.grade)
    })
    return map
  }, [entries, accountFilter])

  const { year, month } = cursor

  const statsByMonth = useMemo(() => {
    const filtered = accountFilter === 'all' ? entries : entries.filter((e) => e.accountId === accountFilter)
    const map = {}
    filtered.forEach((e) => {
      if (!e.date.startsWith(String(year))) return
      const key = e.date.slice(0, 7)
      if (!map[key]) map[key] = { pnl: 0, trades: 0 }
      map[key].pnl += e.profit
      map[key].trades += e.tradesEffective
    })
    return map
  }, [entries, accountFilter, year])

  const relevantAccounts = accountFilter === 'all' ? accounts : accounts.filter((a) => a.id === accountFilter)
  const yearBaseBalance = relevantAccounts.reduce((sum, a) => sum + a.initialBalance, 0)

  const yearStats = useMemo(() => {
    const dayEntries = Object.entries(statsByDay).filter(([date]) => date.startsWith(String(year)))
    const totalPnl = dayEntries.reduce((sum, [, s]) => sum + s.pnl, 0)
    const winningDays = dayEntries.filter(([, s]) => s.pnl >= 0).length
    const tradingDays = dayEntries.length
    const totalTrades = dayEntries.reduce((sum, [, s]) => sum + s.tradesEffective, 0)
    const overtradingDays = dayEntries.filter(([, s]) => s.overtrading).length

    let bestKey = null
    let worstKey = null
    Object.entries(statsByMonth).forEach(([key, s]) => {
      if (!bestKey || s.pnl > statsByMonth[bestKey].pnl) bestKey = key
      if (!worstKey || s.pnl < statsByMonth[worstKey].pnl) worstKey = key
    })

    return {
      totalPnl,
      winningDays,
      tradingDays,
      totalTrades,
      overtradingDays,
      bestMonth: bestKey ? { name: MONTH_NAMES[Number(bestKey.slice(5)) - 1], pnl: statsByMonth[bestKey].pnl } : null,
      worstMonth: worstKey ? { name: MONTH_NAMES[Number(worstKey.slice(5)) - 1], pnl: statsByMonth[worstKey].pnl } : null,
    }
  }, [statsByDay, statsByMonth, year])

  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function changeMonth(delta) {
    setCursor((prev) => {
      let m = prev.month + delta
      let y = prev.year
      if (m < 0) { m = 11; y -= 1 }
      if (m > 11) { m = 0; y += 1 }
      return { year: y, month: m }
    })
  }

  const monthTotal = cells.reduce((sum, d) => {
    if (!d) return sum
    const key = toDateKey(year, month, d)
    return sum + (statsByDay[key]?.pnl || 0)
  }, 0)

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <button className={styles.navBtn} onClick={() => changeMonth(-1)}>‹</button>
        <span className={styles.monthLabel}>{MONTH_NAMES[month]} {year}</span>
        <button className={styles.navBtn} onClick={() => changeMonth(1)}>›</button>

        <select
          className={styles.select}
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
        >
          <option value="all">Tutti i conti</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <span className={monthTotal >= 0 ? styles.totalPositive : styles.totalNegative}>
          Totale mese: {monthTotal >= 0 ? '+' : ''}{monthTotal.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className={styles.weekHeader}>
        {WEEKDAYS.map((w) => <div key={w} className={styles.weekday}>{w}</div>)}
      </div>

      <div className={styles.grid}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} className={styles.emptyCell} />
          const key = toDateKey(year, month, d)
          const stat = statsByDay[key]
          const cellClass = !stat ? styles.cell : stat.pnl >= 0 ? `${styles.cell} ${styles.cellPositive}` : `${styles.cell} ${styles.cellNegative}`
          const pct = stat && yearBaseBalance ? (stat.pnl / yearBaseBalance) * 100 : 0
          const bestGrade = stat && stat.grades.length
            ? stat.grades.reduce((best, g) => (GRADES.indexOf(g) < GRADES.indexOf(best) ? g : best))
            : null
          const totalCalls = stat ? stat.wins + stat.losses : 0
          const winPct = totalCalls ? (stat.wins / totalCalls) * 100 : 0
          return (
            <div key={i} className={cellClass}>
              <div className={styles.cellTop}>
                <span className={styles.dayNum}>{d}</span>
                {stat && stat.accountIds.size > 0 && (
                  <div className={styles.dots}>
                    {[...stat.accountIds].map((id) => (
                      <span key={id} className={styles.dot} style={{ background: accountById[id]?.color }} />
                    ))}
                  </div>
                )}
              </div>
              {stat && stat.overtrading && (
                <span className={styles.overtradingBadge} title="Overtrading Day">⚠ Overtrading</span>
              )}
              {stat && (
                <>
                  <span className={styles.dayPnl}>{stat.pnl >= 0 ? '+' : ''}{stat.pnl.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</span>
                  <div className={styles.metaRow}>
                    <span>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>
                    {bestGrade && <span className={`${styles.gradePill} ${styles[GRADE_CLASS[bestGrade]]}`}>{bestGrade}</span>}
                  </div>
                  {totalCalls > 0 ? (
                    <div className={styles.wlRow}>
                      <div className={styles.winBar}>
                        <span className={styles.segWin} style={{ width: `${winPct}%` }} />
                        <span className={styles.segLoss} style={{ width: `${100 - winPct}%` }} />
                      </div>
                      <span className={styles.wlLabel}>{stat.wins}TP·{stat.losses}SL</span>
                    </div>
                  ) : (
                    <span className={styles.dayTrades}>{stat.tradesOpened || 0} ap. / {stat.tradesEffective} eff.</span>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className={styles.yearWrap}>
        <div className={styles.yearTitle}>Riepilogo mensile {year}</div>
        <div className={styles.yearGrid}>
          {MONTH_NAMES.map((name, i) => {
            const key = `${year}-${String(i + 1).padStart(2, '0')}`
            const stat = statsByMonth[key]
            const pnl = stat?.pnl || 0
            const pct = yearBaseBalance ? (pnl / yearBaseBalance) * 100 : 0
            const cellClass = !stat
              ? styles.monthCellEmpty
              : pnl >= 0 ? styles.monthCellPositive : styles.monthCellNegative
            return (
              <button
                key={key}
                type="button"
                className={`${styles.monthCell} ${cellClass} ${i === month ? styles.monthCellActive : ''}`}
                onClick={() => setCursor({ year, month: i })}
              >
                <div className={styles.monthName}>{name}</div>
                {stat ? (
                  <>
                    <div className={styles.monthPnl}>{pnl >= 0 ? '+' : ''}{pnl.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</div>
                    <div className={styles.monthPct}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</div>
                    <div className={styles.monthTrades}>{stat.trades} trade</div>
                  </>
                ) : (
                  <div className={styles.monthEmptyLabel}>Nessun dato</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.annualWrap}>
        <div className={styles.annualHead}>
          <div>
            <div className={styles.annualTitle}>{year} in cifre</div>
            <div className={yearStats.totalPnl >= 0 ? styles.annualTotalPositive : styles.annualTotalNegative}>
              {yearStats.totalPnl >= 0 ? '+' : ''}{yearStats.totalPnl.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
            </div>
            {yearBaseBalance > 0 && (
              <div className={styles.annualPct}>
                {(yearStats.totalPnl / yearBaseBalance) * 100 >= 0 ? '+' : ''}
                {((yearStats.totalPnl / yearBaseBalance) * 100).toFixed(2)}% sul saldo iniziale
              </div>
            )}
          </div>
          <div className={styles.annualRange}>Gen — Dic {year} · {relevantAccounts.length} cont{relevantAccounts.length === 1 ? 'o' : 'i'}</div>
        </div>

        {yearStats.tradingDays === 0 ? (
          <p className={styles.empty}>Nessun dato per il {year}.</p>
        ) : (
          <div className={styles.statGrid}>
            <div className={`${styles.statCard} ${styles.statGreen}`}>
              <div className={styles.statLabel}>Giorni vincenti</div>
              <div className={styles.statValue}>{yearStats.winningDays} / {yearStats.tradingDays}</div>
              <div className={styles.statSub}>{((yearStats.winningDays / yearStats.tradingDays) * 100).toFixed(1)}% win rate</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Trade totali</div>
              <div className={styles.statValue}>{yearStats.totalTrades}</div>
              <div className={styles.statSub}>~{(yearStats.totalTrades / yearStats.tradingDays).toFixed(1)} al giorno</div>
            </div>
            {yearStats.bestMonth && (
              <div className={`${styles.statCard} ${styles.statGreen}`}>
                <div className={styles.statLabel}>Miglior mese</div>
                <div className={styles.statValue}>{yearStats.bestMonth.name}</div>
                <div className={styles.statSub}>{yearStats.bestMonth.pnl >= 0 ? '+' : ''}{yearStats.bestMonth.pnl.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</div>
              </div>
            )}
            {yearStats.worstMonth && (
              <div className={`${styles.statCard} ${styles.statRed}`}>
                <div className={styles.statLabel}>Peggior mese</div>
                <div className={styles.statValue}>{yearStats.worstMonth.name}</div>
                <div className={styles.statSub}>{yearStats.worstMonth.pnl >= 0 ? '+' : ''}{yearStats.worstMonth.pnl.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</div>
              </div>
            )}
            <div className={`${styles.statCard} ${yearStats.overtradingDays > 0 ? styles.statRed : ''}`}>
              <div className={styles.statLabel}>Giorni overtrading</div>
              <div className={styles.statValue}>{yearStats.overtradingDays}</div>
              <div className={styles.statSub}>{((yearStats.overtradingDays / yearStats.tradingDays) * 100).toFixed(1)}% dei giorni attivi</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Giorni di trading</div>
              <div className={styles.statValue}>{yearStats.tradingDays}</div>
              <div className={styles.statSub}>su {daysElapsedInYear(year)} giorni dell'anno</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
