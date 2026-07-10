import { useEffect, useRef } from 'react'
import DifficultyGauge from './DifficultyGauge'
import { computeChallengeDifficulty, computePayoutDifficulty, FIRM_BY_ID } from '../propFirms'
import styles from './OfferDetailModal.module.css'

function money(v) {
  if (v === null || v === undefined) return 'n/d'
  return `$${v.toLocaleString('it-IT', { maximumFractionDigits: 2 })}`
}

function pct(v) {
  if (v === null || v === undefined || v === 0) return 'nessuna'
  return `${v}%`
}

export default function OfferDetailModal({ offer, effectivePrice, onClose }) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!offer) return null

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Chiudi">×</button>

        <div className={styles.header}>
          <div className={styles.firmRow}>
            <img src={FIRM_BY_ID[offer.firmId].logo} alt="" className={styles.logo} />
            <span className={styles.firm}>{offer.firmName}</span>
          </div>
          <span className={styles.account}>{offer.accountType} — {offer.size / 1000}k</span>
        </div>

        <div className={styles.gauges}>
          <DifficultyGauge label="Difficoltà challenge" score={computeChallengeDifficulty(offer)} />
          <DifficultyGauge label="Difficoltà payout" score={computePayoutDifficulty(offer)} />
        </div>

        <div className={styles.columns}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Challenge / Valutazione</div>
            <dl className={styles.dl}>
              <dt>Profit target</dt><dd>{offer.profitTarget ? money(offer.profitTarget) : 'nessuno (funded istantaneo)'}</dd>
              <dt>Max drawdown</dt><dd>{money(offer.maxDrawdown)} ({offer.drawdownType})</dd>
              <dt>Daily Loss Limit</dt><dd>{offer.dailyLossLimit ? money(offer.dailyLossLimit) : 'nessuno'}</dd>
              <dt>Consistency rule</dt><dd>{pct(offer.consistencyEval)}</dd>
              <dt>Min giorni per passare</dt><dd>{offer.minTradingDays ?? 'non specificato'}</dd>
              <dt>Max contratti</dt><dd>{offer.maxContracts || 'n/d'}</dd>
              <dt>Activation fee</dt><dd>{offer.activationFee === 0 ? 'nessuna' : (offer.activationFee ? money(offer.activationFee) : 'n/d, verifica sul sito')}</dd>
              <dt>Reset fee</dt><dd>{offer.resetFee ? money(offer.resetFee) : 'n/d'}</dd>
            </dl>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Funded / Payout</div>
            <dl className={styles.dl}>
              <dt>Consistency funded</dt><dd>{pct(offer.consistencyFunded)}</dd>
              <dt>Profit split</dt><dd>{offer.profitSplit}%</dd>
              <dt>Cadenza payout</dt><dd>{offer.payoutFrequency || 'n/d'}</dd>
              <dt>Max payout / richiesta</dt><dd>{offer.maxPayout ? money(offer.maxPayout) : 'vedi note sotto'}</dd>
              <dt>Prezzo listino</dt><dd>{money(offer.listinoPrice)}{offer.priceType === 'monthly' ? '/mese' : ' one-time'}</dd>
              <dt>Prezzo effettivo (con tuo sconto)</dt><dd className={styles.effective}>{money(effectivePrice)}</dd>
            </dl>
          </div>
        </div>

        {offer.notes && (
          <div className={styles.notes}>
            <div className={styles.sectionTitle}>Note / dettagli aggiuntivi sul payout</div>
            <p>{offer.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
