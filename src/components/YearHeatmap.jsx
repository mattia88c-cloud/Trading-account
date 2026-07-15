import { useMemo } from 'react'
import { useCollapsed } from '../useCollapsed.js'
import { getHighImpactNewsByDate } from '../newsEvents.js'
import CollapseToggle from './CollapseToggle.jsx'
import styles from './YearHeatmap.module.css'

const MONTH_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

function toLocalDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Griglia di settimane lun-dom che copre l'intero anno, estesa ai margini con i giorni
// dell'anno adiacente necessari a completare la prima/ultima settimana (nascosti in render,
// servono solo per mantenere l'allineamento a colonne piene come nel contribution graph di GitHub).
function buildYearWeeks(year) {
  const jan1 = new Date(year, 0, 1)
  const dec31 = new Date(year, 11, 31)
  const startOffset = (jan1.getDay() + 6) % 7
  const gridStart = new Date(jan1)
  gridStart.setDate(gridStart.getDate() - startOffset)
  const endOffset = 6 - ((dec31.getDay() + 6) % 7)
  const gridEnd = new Date(dec31)
  gridEnd.setDate(gridEnd.getDate() + endOffset)

  const days = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  const weeks = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

// Livello 0-4 in base a quanto quel giorno pesa rispetto al miglior/peggior giorno dell'anno
// (percentili, non valore assoluto): la giornata più verde/rossa dell'anno è sempre livello 4.
function levelFor(pnl, maxWin, maxLoss) {
  if (pnl === undefined) return { tone: 'empty', level: 0 }
  if (pnl === 0) return { tone: 'neutral', level: 0 }
  if (pnl > 0) {
    const ratio = maxWin ? pnl / maxWin : 0
    const level = ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1
    return { tone: 'win', level }
  }
  const ratio = maxLoss ? Math.abs(pnl) / maxLoss : 0
  const level = ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1
  return { tone: 'loss', level }
}

export default function YearHeatmap({ year, statsByDay, storageKey }) {
  const [open, toggle] = useCollapsed(`${storageKey}:yearHeatmap`)
  const [showNews, toggleShowNews] = useCollapsed(`${storageKey}:showNews`, true)
  const weeks = useMemo(() => buildYearWeeks(year), [year])
  const newsByDate = useMemo(() => getHighImpactNewsByDate(year), [year])

  const { maxWin, maxLoss, tradingDays, totalTrades } = useMemo(() => {
    let mWin = 0
    let mLoss = 0
    let days = 0
    let trades = 0
    weeks.flat().forEach((d) => {
      if (d.getFullYear() !== year) return
      const stat = statsByDay[toLocalDateStr(d)]
      if (!stat) return
      days += 1
      trades += stat.tradesEffective || 0
      if (stat.pnl > mWin) mWin = stat.pnl
      if (-stat.pnl > mLoss) mLoss = -stat.pnl
    })
    return { maxWin: mWin, maxLoss: mLoss, tradingDays: days, totalTrades: trades }
  }, [weeks, statsByDay, year])

  const monthLabels = weeks.map((week) => {
    const firstOfMonth = week.find((d) => d.getFullYear() === year && d.getDate() === 1)
    return firstOfMonth ? MONTH_SHORT[firstOfMonth.getMonth()] : null
  })

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span>{year}: {tradingDays} giorni operativi · {totalTrades} trade</span>
        <CollapseToggle open={open} onToggle={toggle} />
      </div>
      {open && (
        <div className={styles.scrollArea}>
          <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
            {monthLabels.map((label, i) => (
              <div key={`m${i}`} className={styles.monthLabel} style={{ gridColumn: i + 1, gridRow: 1 }}>
                {label}
              </div>
            ))}
            {/* Solo lun-ven (di 0-4): sab/dom sarebbero sempre celle vuote per un journal di trading. */}
            {weeks.map((week, wi) => week.slice(0, 5).map((d, di) => {
              if (d.getFullYear() !== year) {
                return <div key={`${wi}-${di}`} className={styles.cellOut} style={{ gridColumn: wi + 1, gridRow: di + 2 }} />
              }
              const key = toLocalDateStr(d)
              const stat = statsByDay[key]
              const { tone, level } = levelFor(stat?.pnl, maxWin, maxLoss)
              const news = newsByDate[key]
              let title = stat
                ? `${key}: ${stat.pnl >= 0 ? '+' : ''}${stat.pnl.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`
                : `${key}: nessun trade`
              if (news) title += ` · news: ${news.join(', ')}`
              return (
                <div
                  key={`${wi}-${di}`}
                  className={`${styles.cell} ${styles[`${tone}${level}`]} ${news && showNews ? styles.newsDay : ''}`}
                  style={{ gridColumn: wi + 1, gridRow: di + 2 }}
                  title={title}
                />
              )
            }))}
          </div>

          <div className={styles.legend}>
            <span className={styles.legendLabel}>Perdita</span>
            {[4, 3, 2, 1].map((l) => <span key={`l${l}`} className={`${styles.legendSwatch} ${styles[`loss${l}`]}`} />)}
            <span className={`${styles.legendSwatch} ${styles.empty0}`} />
            {[1, 2, 3, 4].map((l) => <span key={`w${l}`} className={`${styles.legendSwatch} ${styles[`win${l}`]}`} />)}
            <span className={styles.legendLabel}>Guadagno</span>
            <label className={styles.newsLegend}>
              <input
                type="checkbox"
                className={styles.newsCheckbox}
                checked={showNews}
                onChange={toggleShowNews}
              />
              <span className={`${styles.legendSwatch} ${styles.empty0} ${showNews ? styles.newsDay : ''}`} />
              News ad alto impatto (FOMC · NFP · CPI · PCE) — spunta per mostrare/nascondere
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
