import { useState } from 'react'
import Card from './Card'
import { MISSION_TYPES } from '../useMissions'
import styles from './FriendsView.module.css'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']
const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

const PERIODS = [
  { id: 'weekly', label: 'Settimanale' },
  { id: 'monthly', label: 'Mensile' },
  { id: 'quarterly', label: 'Trimestrale' },
]

function periodLabel(period) {
  const now = new Date()
  if (period === 'monthly') return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`
  if (period === 'quarterly') return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
  return '% di profitto giornaliera, lunedì-venerdì (settimana corrente)'
}

function Crown() {
  return (
    <svg className={styles.crownIcon} width="22" height="22" viewBox="0 0 24 24" fill="var(--accent)" aria-hidden="true">
      <path d="M3 8.5 7 11l5-6.5L17 11l4-2.5-1.8 10.3a1 1 0 0 1-1 .7H5.8a1 1 0 0 1-1-.7L3 8.5z" />
    </svg>
  )
}

function fmtMoney(n) {
  return `$${Math.round(n).toLocaleString('it-IT')}`
}

function fmtMoneySigned(n) {
  return `${n >= 0 ? '+' : ''}$${Math.round(n).toLocaleString('it-IT')}`
}

function fmtPct(n) {
  if (n === null || n === undefined) return null
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

// Il "punto debole" è il tipo di missione fallita più frequente nello storico condiviso
// dell'amico (a parità di conteggio vince la più recente). Usa solo missions_summary, già
// aggregato e già pubblicato sulla classifica — nessun nuovo dato grezzo esposto tra amici.
function getTopStruggle(missionsSummary) {
  const failed = (missionsSummary || []).filter((m) => m.status === 'failed')
  if (failed.length === 0) return null
  const byType = {}
  failed.forEach((m) => {
    if (!byType[m.type]) byType[m.type] = { count: 0, lastDate: m.date }
    byType[m.type].count += 1
    if (m.date > byType[m.type].lastDate) byType[m.type].lastDate = m.date
  })
  const [topType] = Object.entries(byType).sort((a, b) => (
    b[1].count - a[1].count || b[1].lastDate.localeCompare(a[1].lastDate)
  ))[0]
  return MISSION_TYPES[topType] || null
}

export default function FriendsView({ rows, currentUserId, loading }) {
  const [period, setPeriod] = useState('weekly')

  if (loading) return <p className={styles.empty}>Caricamento…</p>
  if (rows.length === 0) {
    return <p className={styles.empty}>Nessun dato ancora: torna qui dopo aver registrato qualche giornata.</p>
  }

  // Settimanale ha il dettaglio giorno per giorno (dailyPct); mensile e trimestrale sono solo
  // totali aggregati (stesso principio "niente trade grezzi condivisi" del resto della classifica).
  const pctField = period === 'monthly' ? 'monthly_pct' : period === 'quarterly' ? 'quarterly_pct' : null
  const profitField = period === 'monthly' ? 'monthly_profit' : period === 'quarterly' ? 'quarterly_profit' : null

  const rankedByPeriod = period === 'weekly'
    ? [...rows]
      .map((r) => ({ ...r, periodPct: (r.daily_pct || []).reduce((sum, d) => sum + (d.pct || 0), 0), periodProfit: r.weekly_profit ?? 0 }))
      .sort((a, b) => b.periodPct - a.periodPct)
    : [...rows]
      .map((r) => ({ ...r, periodPct: r[pctField] ?? null, periodProfit: r[profitField] ?? 0 }))
      .sort((a, b) => (b.periodPct ?? -Infinity) - (a.periodPct ?? -Infinity))

  const rankedByDiscipline = [...rows]
    .filter((r) => r.discipline_score !== null && r.discipline_score !== undefined)
    .sort((a, b) => b.discipline_score - a.discipline_score)

  return (
    <div className={styles.wrap}>
      <Card>
        <div className={styles.titleRow}>
          <div className={styles.title}>Classifica {PERIODS.find((p) => p.id === period).label.toLowerCase()}</div>
          <div className={styles.periodTabs}>
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.periodTab} ${period === p.id ? styles.periodTabActive : ''}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <p className={styles.subtitle}>{periodLabel(period)}</p>
        <div className={styles.grid}>
          {rankedByPeriod.map((r, i) => {
            const struggle = getTopStruggle(r.missions_summary)
            return (
            <div key={r.user_id} className={styles.boxWrap}>
              {i === 0 && <Crown />}
              <div className={`${styles.box} ${r.user_id === currentUserId ? styles.boxMe : ''}`}>
              <div className={styles.boxHeader}>
                <span className={styles.rank}>#{i + 1}</span>
                <span className={styles.username}>{r.username || 'Utente'}</span>
              </div>
              <div className={styles.boxMeta}>
                <span>{fmtMoney(r.balance)}</span>
                <span>{r.account_count ?? 0} {r.account_count === 1 ? 'conto' : 'conti'}</span>
              </div>
              <div
                className={`${styles.struggleTag} ${!struggle ? styles.struggleTagEmpty : ''}`}
                style={struggle ? { '--struggle-color': struggle.color } : undefined}
              >
                {struggle ? (
                  <><span aria-hidden="true">{struggle.icon}</span> Punto debole: {struggle.label}</>
                ) : (
                  <>Nessun punto debole rilevato</>
                )}
              </div>
              {period === 'weekly' && (
                <div className={styles.cubes}>
                  {WEEKDAY_LABELS.map((label, idx) => {
                    const day = (r.daily_pct || [])[idx]
                    const pct = day?.pct
                    const fillClass = pct === null || pct === undefined
                      ? styles.cubeEmpty
                      : pct >= 0 ? styles.cubePositive : styles.cubeNegative
                    return (
                      <div key={label} className={styles.cube}>
                        <span className={styles.cubeLabel}>{label}</span>
                        <div className={`${styles.cubeFill} ${fillClass}`}>{fmtPct(pct) || '—'}</div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className={period === 'weekly' ? styles.weekFooter : styles.periodFooter}>
                <span className={(r.periodPct ?? 0) >= 0 ? styles.weekTotalPositive : styles.weekTotalNegative}>
                  {fmtPct(r.periodPct) || '—'}
                </span>
                <span className={(r.periodProfit ?? 0) >= 0 ? styles.weekTotalPositive : styles.weekTotalNegative}>
                  {fmtMoneySigned(r.periodProfit ?? 0)}
                </span>
              </div>
              </div>
            </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <div className={styles.title}>Classifica disciplina</div>
        <p className={styles.subtitle}>Score comportamentale e missioni concluse</p>
        <div className={styles.list}>
          {rankedByDiscipline.length === 0 && <p className={styles.empty}>Nessun dato ancora.</p>}
          {rankedByDiscipline.map((r, i) => {
            const completed = (r.missions_summary || []).filter((m) => m.status === 'completed')
            const failed = (r.missions_summary || []).filter((m) => m.status === 'failed')
            return (
              <div key={r.user_id} className={styles.boxWrap}>
                {i === 0 && <Crown />}
                <div className={`${styles.row} ${r.user_id === currentUserId ? styles.rowMe : ''}`}>
                <div className={styles.rowHeader}>
                  <span className={styles.rank}>#{i + 1}</span>
                  <span className={styles.username}>{r.username || 'Utente'}</span>
                  <span className={styles.score}>{r.discipline_score}/100</span>
                </div>
                <div className={styles.scoreTrack}>
                  <div className={styles.scoreFill} style={{ width: `${r.discipline_score}%` }} />
                </div>
                {completed.length === 0 && failed.length === 0 ? (
                  <div className={styles.noMissions}>Nessuna missione conclusa</div>
                ) : (
                  <div className={styles.missionGroups}>
                    {completed.length > 0 && (
                      <div className={styles.missionRow}>
                        <span className={styles.missionRowLabel}>Superate</span>
                        <div className={styles.missionBadges}>
                          {completed.map((m, idx) => (
                            <span key={idx} className={styles.missionBadgeSuccess}>✓ {m.label}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {failed.length > 0 && (
                      <div className={styles.missionRow}>
                        <span className={styles.missionRowLabel}>Fallite</span>
                        <div className={styles.missionBadges}>
                          {failed.map((m, idx) => (
                            <span key={idx} className={styles.missionBadgeFail}>✕ {m.label}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
