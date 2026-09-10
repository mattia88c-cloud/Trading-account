import { useState } from 'react'
import Card from './Card'
import { useCollapsed } from '../useCollapsed.js'
import { useHints } from '../useHints.jsx'
import CollapseToggle from './CollapseToggle.jsx'
import styles from './OvertradingBanner.module.css'

const DISMISSED_AT_KEY = 'trading-accounts:overtradingBannerDismissedAt'

function readDismissedAt() {
  try {
    return localStorage.getItem(DISMISSED_AT_KEY) || ''
  } catch {
    return ''
  }
}

export default function OvertradingBanner({ accounts, entries }) {
  const { hintsEnabled } = useHints()
  const [open, toggle] = useCollapsed('dashboard:overtradingBanner')
  // Il cestino non cancella le giornate di overtrading (restano nello storico/statistiche): nasconde
  // solo il banner finché non arriva una nuova giornata di overtrading più recente di quando è
  // stato svuotato, cosi non torna a mostrare all'infinito le stesse righe già viste.
  const [dismissedAt, setDismissedAt] = useState(readDismissedAt)
  const overtradingEntries = entries
    .filter((e) => e.overtradingDay && (!dismissedAt || e.createdAt > dismissedAt))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  if (overtradingEntries.length === 0) return null

  function handleDismiss(e) {
    e.stopPropagation()
    const now = new Date().toISOString()
    try {
      localStorage.setItem(DISMISSED_AT_KEY, now)
    } catch {
      // localStorage non disponibile (es. modalità privata): il banner tornerà al prossimo reload
    }
    setDismissedAt(now)
  }

  function accountName(id) {
    return accounts.find((a) => a.id === id)?.name || 'Conto eliminato'
  }

  return (
    <Card className={styles.card}>
      <div className={styles.title}>
        <span>⚠ Giorni Overtrading recenti</span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.dismissBtn}
            onClick={handleDismiss}
            aria-label="Nascondi questo box"
            title="Nascondi questo box"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
          <CollapseToggle open={open} onToggle={toggle} />
        </div>
      </div>
      {open && (
        <>
          {hintsEnabled && (
            <p className={styles.subtitle}>
              Questi giorni pesano sul saldo reale ma sono esclusi dalle statistiche tecniche (dati a bassa affidabilità).
            </p>
          )}
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
        </>
      )}
    </Card>
  )
}
