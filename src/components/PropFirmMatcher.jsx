import { useMemo, useState } from 'react'
import Card from './Card'
import DifficultyGauge from './DifficultyGauge'
import {
  PROP_FIRM_OFFERS, ACCOUNT_SIZES, DRAWDOWN_TYPES, FIRM_BY_ID, computeChallengeDifficulty, computePayoutDifficulty, computeEffectivePrice,
} from '../propFirms'
import styles from './PropFirmMatcher.module.css'

const DEFAULT_PREFS = {
  size: '',
  drawdownType: '',
  dll: '',
  minConsistencyEval: '',
  minConsistencyFunded: '',
  minProfitSplit: '',
  maxTradingDays: '',
  maxPayoutDays: '',
}

function formatMoney(v) {
  if (v === null || v === undefined) return 'n/d'
  return `$${v.toLocaleString('it-IT', { maximumFractionDigits: 2 })}`
}

// Ogni criterio pesa 1 se l'utente lo ha impostato (valore diverso da default), 0 se lasciato
// "indifferente". Il punteggio finale è la media dei punteggi parziali attivi, in %.
// Il prezzo non entra mai in questo calcolo: è solo un confronto di regole.
function scoreOffer(offer, prefs) {
  let total = 0
  let count = 0

  if (prefs.drawdownType) {
    count += 1
    total += offer.drawdownType === prefs.drawdownType ? 1 : 0
  }
  if (prefs.dll) {
    count += 1
    const hasDll = offer.dailyLossLimit != null
    total += (prefs.dll === 'yes') === hasDll ? 1 : 0
  }
  if (prefs.minConsistencyEval !== '') {
    count += 1
    const x = Number(prefs.minConsistencyEval)
    const v = offer.consistencyEval || 999
    total += v >= x ? 1 : v / x
  }
  if (prefs.minConsistencyFunded !== '') {
    count += 1
    const x = Number(prefs.minConsistencyFunded)
    const v = offer.consistencyFunded || 999
    total += v >= x ? 1 : v / x
  }
  if (prefs.minProfitSplit !== '') {
    count += 1
    const x = Number(prefs.minProfitSplit)
    total += offer.profitSplit >= x ? 1 : offer.profitSplit / x
  }
  if (prefs.maxTradingDays !== '') {
    count += 1
    const x = Number(prefs.maxTradingDays)
    const v = offer.minTradingDays || 0
    total += v <= x ? 1 : x / v
  }
  if (prefs.maxPayoutDays !== '') {
    count += 1
    const x = Number(prefs.maxPayoutDays)
    const v = offer.payoutFrequencyDays ?? 999
    total += v <= x ? 1 : x / v
  }

  if (count === 0) return null
  return Math.round((total / count) * 100)
}

// "Convenienza" 1-10: 60% quanto costa (prezzo effettivo, quindi con lo sconto che hai impostato
// tu nella tabella sotto, per $1.000 di size, confrontato tra i risultati mostrati) + 40% quanto
// rispetta le regole richieste (matchScore). Se manca il prezzo di listino, si basa solo sul match.
function attachConvenienza(scoredResults, overrides) {
  const withPrice = scoredResults.map((r) => {
    const effectivePrice = computeEffectivePrice(r.offer, overrides[r.offer.id])
    const costPerK = effectivePrice != null ? effectivePrice / (r.offer.size / 1000) : null
    return { ...r, effectivePrice, costPerK }
  })
  const costs = withPrice.map((r) => r.costPerK).filter((c) => c != null)
  const minCost = costs.length ? Math.min(...costs) : null
  const maxCost = costs.length ? Math.max(...costs) : null

  return withPrice.map((r) => {
    let priceValueNorm = null
    if (r.costPerK != null && minCost != null) {
      priceValueNorm = maxCost === minCost ? 100 : 100 * (1 - (r.costPerK - minCost) / (maxCost - minCost))
    }
    const blended = priceValueNorm != null ? 0.6 * priceValueNorm + 0.4 * r.matchScore : r.matchScore
    const convenienza = Math.max(1, Math.min(10, Math.round(1 + 9 * (blended / 100))))
    return { ...r, convenienza }
  })
}

export default function PropFirmMatcher({ overrides }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)

  function update(field, value) {
    setPrefs((prev) => ({ ...prev, [field]: value }))
  }

  function reset() {
    setPrefs(DEFAULT_PREFS)
  }

  const results = useMemo(() => {
    const bySize = prefs.size ? PROP_FIRM_OFFERS.filter((o) => o.size === Number(prefs.size)) : PROP_FIRM_OFFERS
    const scored = bySize
      .map((offer) => ({ offer, matchScore: scoreOffer(offer, prefs) }))
      .filter((r) => r.matchScore !== null)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5)
    return attachConvenienza(scored, overrides)
  }, [prefs, overrides])

  const anyCriteriaSet = Object.entries(prefs).some(([k, v]) => k !== 'size' && v !== '')

  return (
    <Card>
      <div className={styles.title}>Trova la prop ideale</div>
      <p className={styles.subtitle}>
        Imposta le regole che ti interessano (il match è calcolato solo sulle regole, non sul prezzo): confronto le
        offerte raccolte e ti mostro le più simili alle tue preferenze. Il prezzo che vedi nel risultato riflette lo
        sconto/prezzo manuale che eventualmente hai impostato nella tabella sotto.
      </p>

      <div className={styles.form}>
        <label className={styles.field}>
          <span>Size</span>
          <select value={prefs.size} onChange={(e) => update('size', e.target.value)}>
            <option value="">Qualsiasi</option>
            {ACCOUNT_SIZES.map((s) => (
              <option key={s} value={s}>{s / 1000}k</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Tipo drawdown</span>
          <select value={prefs.drawdownType} onChange={(e) => update('drawdownType', e.target.value)}>
            <option value="">Indifferente</option>
            {DRAWDOWN_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Daily Loss Limit</span>
          <select value={prefs.dll} onChange={(e) => update('dll', e.target.value)}>
            <option value="">Indifferente</option>
            <option value="yes">Sì, lo voglio</option>
            <option value="no">No, preferisco senza</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Consistency eval minima gradita (%)</span>
          <input
            type="number"
            placeholder="es. 40 (più alto = più permissiva)"
            value={prefs.minConsistencyEval}
            onChange={(e) => update('minConsistencyEval', e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Consistency funded minima gradita (%)</span>
          <input
            type="number"
            placeholder="es. 30"
            value={prefs.minConsistencyFunded}
            onChange={(e) => update('minConsistencyFunded', e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Profit split minimo desiderato (%)</span>
          <input
            type="number"
            placeholder="es. 90"
            value={prefs.minProfitSplit}
            onChange={(e) => update('minProfitSplit', e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Giorni min. di trading, massimo tollerato</span>
          <input
            type="number"
            placeholder="es. 2"
            value={prefs.maxTradingDays}
            onChange={(e) => update('maxTradingDays', e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Payout entro X giorni, massimo tollerato</span>
          <input
            type="number"
            placeholder="es. 5"
            value={prefs.maxPayoutDays}
            onChange={(e) => update('maxPayoutDays', e.target.value)}
          />
        </label>
      </div>

      <button className={styles.resetBtn} onClick={reset}>Reimposta criteri</button>

      {!anyCriteriaSet && (
        <p className={styles.hint}>Imposta almeno un criterio (oltre alla size) per vedere un consiglio.</p>
      )}

      {anyCriteriaSet && (
        <div className={styles.results}>
          {results.map(({ offer, matchScore, effectivePrice, convenienza }, i) => (
            <div key={offer.id} className={styles.resultCard}>
              <div className={styles.resultHeader}>
                <span className={styles.rank}>#{i + 1}</span>
                <img src={FIRM_BY_ID[offer.firmId].logo} alt="" className={styles.logo} />
                <span className={styles.resultName}>{offer.firmName} — {offer.accountType} ({offer.size / 1000}k)</span>
                <span className={styles.matchScore}>{matchScore}% match</span>
                <span className={styles.convenienza}>Convenienza {convenienza}/10</span>
              </div>
              <div className={styles.resultRules}>
                Target: {offer.profitTarget ? `$${offer.profitTarget.toLocaleString('it-IT')}` : 'nessuno (istantaneo)'} ·
                {' '}Drawdown: ${offer.maxDrawdown.toLocaleString('it-IT')} ({offer.drawdownType}) ·
                {' '}DLL: {offer.dailyLossLimit ? `$${offer.dailyLossLimit.toLocaleString('it-IT')}` : 'nessuno'} ·
                {' '}Consistency: {offer.consistencyEval || 0}% eval / {offer.consistencyFunded || 0}% funded ·
                {' '}Split: {offer.profitSplit}%
              </div>
              <div className={styles.resultPrice}>
                Costo challenge: {formatMoney(effectivePrice)}{offer.priceType === 'monthly' ? '/mese' : ''}
                {' '}· Activation fee: {offer.activationFee ? formatMoney(offer.activationFee) : (offer.activationFee === 0 ? 'nessuna' : 'n/d, verifica sul sito')}
              </div>
              <div className={styles.gauges}>
                <DifficultyGauge label="Difficoltà challenge" score={computeChallengeDifficulty(offer)} />
                <DifficultyGauge label="Difficoltà payout" score={computePayoutDifficulty(offer)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
