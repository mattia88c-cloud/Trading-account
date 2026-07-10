import Card from './Card'
import styles from './FriendsView.module.css'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']

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

export default function FriendsView({ rows, currentUserId, loading }) {
  if (loading) return <p className={styles.empty}>Caricamento…</p>
  if (rows.length === 0) {
    return <p className={styles.empty}>Nessun dato ancora: torna qui dopo aver registrato qualche giornata.</p>
  }

  const rankedByWeek = [...rows]
    .map((r) => ({ ...r, weekTotalPct: (r.daily_pct || []).reduce((sum, d) => sum + (d.pct || 0), 0) }))
    .sort((a, b) => b.weekTotalPct - a.weekTotalPct)

  const rankedByDiscipline = [...rows]
    .filter((r) => r.discipline_score !== null && r.discipline_score !== undefined)
    .sort((a, b) => b.discipline_score - a.discipline_score)

  return (
    <div className={styles.wrap}>
      <Card>
        <div className={styles.title}>Classifica settimanale</div>
        <p className={styles.subtitle}>% di profitto giornaliera, lunedì-venerdì (settimana corrente)</p>
        <div className={styles.grid}>
          {rankedByWeek.map((r, i) => (
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
              <div className={styles.weekFooter}>
                <span className={r.weekTotalPct >= 0 ? styles.weekTotalPositive : styles.weekTotalNegative}>
                  {fmtPct(r.weekTotalPct)}
                </span>
                <span className={(r.weekly_profit ?? 0) >= 0 ? styles.weekTotalPositive : styles.weekTotalNegative}>
                  {fmtMoneySigned(r.weekly_profit ?? 0)}
                </span>
              </div>
              </div>
            </div>
          ))}
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
