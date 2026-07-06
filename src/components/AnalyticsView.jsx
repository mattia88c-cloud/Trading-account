import styles from './AnalyticsView.module.css'

export default function AnalyticsView({ accounts, getAnalytics }) {
  if (accounts.length === 0) {
    return <p className={styles.empty}>Crea un conto per vedere le statistiche.</p>
  }

  return (
    <div className={styles.grid}>
      {accounts.map((account) => {
        const stats = getAnalytics(account.id)
        return (
          <div key={account.id} className={styles.card}>
            <div className={styles.header}>{account.name}</div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Saldo attuale</span>
              <span className={styles.statValue}>${stats.currentBalance.toLocaleString('it-IT', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>P/L totale</span>
              <span className={stats.totalPnl >= 0 ? styles.positive : styles.negative}>
                {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Crescita</span>
              <span className={stats.growthPct >= 0 ? styles.positive : styles.negative}>
                {stats.growthPct >= 0 ? '+' : ''}{stats.growthPct.toFixed(2)}%
              </span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Win rate</span>
              <span className={styles.statValue}>{stats.winRate.toFixed(1)}%</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Giorni tradati</span>
              <span className={styles.statValue}>{stats.daysTraded} ({stats.winningDays}W / {stats.losingDays}L)</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Trade aperti / effettivi</span>
              <span className={styles.statValue}>{stats.totalTradesOpened} / {stats.totalTradesEffective}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Miglior giorno</span>
              <span className={stats.bestDay && stats.bestDay.profit >= 0 ? styles.positive : styles.negative}>
                {stats.bestDay ? `${stats.bestDay.profit >= 0 ? '+' : ''}${stats.bestDay.profit.toLocaleString('it-IT')} (${stats.bestDay.date})` : '—'}
              </span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Peggior giorno</span>
              <span className={stats.worstDay && stats.worstDay.profit >= 0 ? styles.positive : styles.negative}>
                {stats.worstDay ? `${stats.worstDay.profit >= 0 ? '+' : ''}${stats.worstDay.profit.toLocaleString('it-IT')} (${stats.worstDay.date})` : '—'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
