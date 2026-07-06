import styles from './AccountsOverview.module.css'

export default function AccountsOverview({ accounts, getAccountBalance, onDelete }) {
  if (accounts.length === 0) {
    return <p className={styles.empty}>Nessun conto creato. Aggiungine uno per iniziare.</p>
  }

  return (
    <div className={styles.grid}>
      {accounts.map((account) => {
        const balance = getAccountBalance(account.id)
        const pnl = balance - account.initialBalance
        const pnlPct = (pnl / account.initialBalance) * 100
        return (
          <div key={account.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.name}>{account.name}</span>
              <span className={`${styles.badge} ${account.type === 'propfirm' ? styles.badgeProp : styles.badgePersonal}`}>
                {account.type === 'propfirm' ? 'Prop Firm' : 'Personale'}
              </span>
            </div>
            <div className={styles.balance}>
              ${balance.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
            </div>
            <div className={pnl >= 0 ? styles.pnlPositive : styles.pnlNegative}>
              {pnl >= 0 ? '+' : ''}
              {pnl.toLocaleString('it-IT', { maximumFractionDigits: 2 })} ({pnlPct >= 0 ? '+' : ''}
              {pnlPct.toFixed(2)}%)
            </div>
            <button className={styles.delete} onClick={() => onDelete(account.id)}>
              Elimina
            </button>
          </div>
        )
      })}
    </div>
  )
}
