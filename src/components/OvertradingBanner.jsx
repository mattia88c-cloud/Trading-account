import Card from './Card'
import styles from './OvertradingBanner.module.css'

export default function OvertradingBanner({ accounts, entries }) {
  const overtradingEntries = entries
    .filter((e) => e.overtradingDay)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  if (overtradingEntries.length === 0) return null

  function accountName(id) {
    return accounts.find((a) => a.id === id)?.name || 'Conto eliminato'
  }

  return (
    <Card className={styles.card}>
      <div className={styles.title}>⚠ Giorni Overtrading recenti</div>
      <p className={styles.subtitle}>
        Questi giorni pesano sul saldo reale ma sono esclusi dalle statistiche tecniche (dati a bassa affidabilità).
      </p>
      <div className={styles.list}>
        {overtradingEntries.map((e) => (
          <div key={e.id} className={styles.row}>
            <span className={styles.date}>{e.date}</span>
            <span className={styles.account}>{accountName(e.accountId)}</span>
            <span className={e.profit >= 0 ? styles.pnlPositive : styles.pnlNegative}>
              {e.profit >= 0 ? '+' : ''}{e.profit.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
            </span>
            <span className={styles.trigger}>{e.mainTrigger || '—'}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
