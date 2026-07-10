import { useMemo, useState } from 'react'
import styles from './CalendarView.module.css'

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function toDateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function CalendarView({ accounts, entries }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [accountFilter, setAccountFilter] = useState('all')

  const statsByDay = useMemo(() => {
    const filtered = accountFilter === 'all' ? entries : entries.filter((e) => e.accountId === accountFilter)
    const map = {}
    filtered.forEach((e) => {
      if (!map[e.date]) map[e.date] = { pnl: 0, tradesOpened: 0, tradesEffective: 0, overtrading: false }
      map[e.date].pnl += e.profit
      map[e.date].tradesOpened += e.tradesOpened || 0
      map[e.date].tradesEffective += e.tradesEffective
      if (e.overtradingDay) map[e.date].overtrading = true
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
          return (
            <div key={i} className={cellClass}>
              <span className={styles.dayNum}>{d}</span>
              {stat && stat.overtrading && (
                <span className={styles.overtradingBadge} title="Overtrading Day">⚠ Overtrading</span>
              )}
              {stat && (
                <>
                  <span className={styles.dayPnl}>{stat.pnl >= 0 ? '+' : ''}{stat.pnl.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</span>
                  <span className={styles.dayTrades}>{stat.tradesOpened} ap. / {stat.tradesEffective} eff.</span>
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
    </div>
  )
}
