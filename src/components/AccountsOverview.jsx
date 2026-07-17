import { useState } from 'react'
import Sparkline from './Sparkline.jsx'
import AccountGoalGauge from './AccountGoalGauge.jsx'
import styles from './AccountsOverview.module.css'

function distanceColorClass(distance, maxDrawdown, styles) {
  if (!maxDrawdown) return styles.thresholdDistance
  const pct = distance / maxDrawdown
  if (pct > 1) return styles.distanceGreen
  if (pct >= 0.75) return styles.distanceNeutral
  if (pct >= 0.5) return styles.distanceOrange
  return styles.distanceRed
}

export default function AccountsOverview({
  accounts,
  getAccountBalance,
  getAccountSeries,
  getThreshold,
  payouts,
  onDelete,
  onToggleActive,
  onUpdateTarget,
  selectedId,
  onSelect,
}) {
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [targetEditId, setTargetEditId] = useState(null)
  const [targetDraft, setTargetDraft] = useState('')

  if (accounts.length === 0) {
    return <p className={styles.empty}>Nessun conto creato. Aggiungine uno per iniziare.</p>
  }

  return (
    <div className={styles.grid}>
      {accounts.map((account) => {
        const balance = getAccountBalance(account.id)
        const pnl = balance - account.initialBalance
        const pnlPct = (pnl / account.initialBalance) * 100
        const isSelected = selectedId === account.id
        const threshold = getThreshold(account.id)
        const isMenuOpen = menuOpenId === account.id
        const series = getAccountSeries ? getAccountSeries(account.id) : null
        const sparklineColor = threshold?.breached ? 'var(--red)' : account.color
        const payoutTotal = payouts
          .filter((p) => p.accountId === account.id)
          .reduce((sum, p) => sum + p.amount, 0)

        return (
          <div
            key={account.id}
            className={`${styles.card} ${pnl >= 0 ? styles.cardPositive : styles.cardNegative} ${isSelected ? styles.cardSelected : ''} ${threshold?.breached ? styles.cardBreached : ''} ${!account.active ? styles.cardInactive : ''}`}
            style={{ borderLeftColor: account.color }}
            onClick={() => onSelect(isSelected ? null : account.id)}
          >
            <div className={styles.cardHeader}>
              <span className={styles.name}>
                <span className={styles.dot} style={{ background: account.color }} />
                {account.name}
                {!account.active && <span className={styles.inactiveTag}>Disattivato</span>}
              </span>
              <div className={styles.headerRight}>
                <span className={`${styles.badge} ${account.type === 'propfirm' ? styles.badgeProp : styles.badgePersonal}`}>
                  {account.type === 'propfirm' ? 'Prop Firm' : 'Personale'}
                </span>
                <button
                  className={styles.menuButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpenId(isMenuOpen ? null : account.id)
                    setConfirmDeleteId(null)
                    setTargetEditId(null)
                  }}
                >
                  ⋮
                </button>
                {isMenuOpen && (
                  <div className={styles.menu} onClick={(e) => e.stopPropagation()}>
                    {confirmDeleteId === account.id ? (
                      <div className={styles.confirmBox}>
                        <div className={styles.confirmText}>
                          Eliminare {account.name}? Rimuove anche tutte le entry e i payout collegati.
                        </div>
                        <div className={styles.confirmActions}>
                          <button
                            className={styles.menuItem}
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Annulla
                          </button>
                          <button
                            className={`${styles.menuItem} ${styles.menuItemDanger}`}
                            onClick={() => {
                              onDelete(account.id)
                              setConfirmDeleteId(null)
                              setMenuOpenId(null)
                            }}
                          >
                            Conferma
                          </button>
                        </div>
                      </div>
                    ) : targetEditId === account.id ? (
                      <div className={styles.confirmBox}>
                        <div className={styles.confirmText}>
                          Traguardo di profitto ($) — es. primo payout
                        </div>
                        <input
                          type="number"
                          min="0"
                          className={styles.targetInput}
                          value={targetDraft}
                          onChange={(e) => setTargetDraft(e.target.value)}
                          autoFocus
                        />
                        <div className={styles.confirmActions}>
                          <button className={styles.menuItem} onClick={() => setTargetEditId(null)}>
                            Annulla
                          </button>
                          <button
                            className={styles.menuItem}
                            onClick={() => {
                              onUpdateTarget(account.id, targetDraft)
                              setTargetEditId(null)
                              setMenuOpenId(null)
                            }}
                          >
                            Salva
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          className={styles.menuItem}
                          onClick={() => {
                            onToggleActive(account.id)
                            setMenuOpenId(null)
                          }}
                        >
                          {account.active ? 'Disattiva' : 'Attiva'}
                        </button>
                        <button
                          className={styles.menuItem}
                          onClick={() => {
                            setTargetDraft(account.targetProfit ? String(account.targetProfit) : '')
                            setTargetEditId(account.id)
                          }}
                        >
                          {account.targetProfit ? 'Modifica traguardo' : 'Imposta traguardo'}
                        </button>
                        <button
                          className={`${styles.menuItem} ${styles.menuItemDanger}`}
                          onClick={() => setConfirmDeleteId(account.id)}
                        >
                          Elimina
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.balance}>
              ${balance.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
            </div>
            <div className={pnl >= 0 ? styles.pnlPositive : styles.pnlNegative}>
              {pnl >= 0 ? '+' : ''}
              {pnl.toLocaleString('it-IT', { maximumFractionDigits: 2 })} ({pnlPct >= 0 ? '+' : ''}
              {pnlPct.toFixed(2)}%)
            </div>
            {series && series.length > 1 && (
              <div className={styles.sparkline}>
                <Sparkline series={series} color={sparklineColor} />
              </div>
            )}
            {threshold && (
              <>
                <div className={threshold.breached ? styles.thresholdBreached : styles.thresholdInfo}>
                  {threshold.breached ? 'CONTO BRUCIATO — ' : ''}
                  Threshold: ${threshold.threshold.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
                  {threshold.locked ? ' (bloccata)' : threshold.fixed ? ' (fisso)' : ''}
                </div>
                {!threshold.breached && (
                  <div className={distanceColorClass(balance - threshold.threshold, threshold.fixed ? (account.initialBalance - threshold.threshold) : account.maxDrawdown, styles)}>
                    Distanza dal bruciarlo: ${(balance - threshold.threshold).toLocaleString('it-IT', { maximumFractionDigits: 2 })}
                  </div>
                )}
                {account.active && (
                  <AccountGoalGauge account={account} threshold={threshold} currentBalance={balance} />
                )}
              </>
            )}
            {payoutTotal > 0 && (
              <div className={styles.payoutInfo}>
                Payout totali: ${payoutTotal.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
