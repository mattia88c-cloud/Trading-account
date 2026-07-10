import { useMemo, useState } from 'react'
import Card from './Card'
import DifficultyGauge from './DifficultyGauge'
import PropFirmMatcher from './PropFirmMatcher'
import OfferDetailModal from './OfferDetailModal'
import {
  PROP_FIRM_OFFERS, FIRM_LIST, FIRM_BY_ID, ACCOUNT_SIZES, DRAWDOWN_TYPES, computeEffectivePrice,
  computeChallengeDifficulty, computePayoutDifficulty,
} from '../propFirms'
import { usePropFirmOverrides } from '../usePropFirmOverrides'
import styles from './PropFirmFinder.module.css'

function formatMoney(v) {
  if (v === null || v === undefined) return '—'
  return `$${v.toLocaleString('it-IT', { maximumFractionDigits: 2 })}`
}

function formatPct(v) {
  if (v === null || v === undefined || v === 0) return '—'
  return `${v}%`
}

export default function PropFirmFinder() {
  const { overrides, setDiscountPercent, setManualPrice, clearOverride } = usePropFirmOverrides()
  const [firmFilter, setFirmFilter] = useState(() => new Set(FIRM_LIST.map((f) => f.id)))
  const [sizeFilter, setSizeFilter] = useState(() => new Set(ACCOUNT_SIZES))
  const [sortByPrice, setSortByPrice] = useState(false)
  const [noActivationOnly, setNoActivationOnly] = useState(false)
  const [noConsistencyFundedOnly, setNoConsistencyFundedOnly] = useState(false)
  const [onePassDayOnly, setOnePassDayOnly] = useState(false)
  const [selectedOfferId, setSelectedOfferId] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [drawdownTypeFilter, setDrawdownTypeFilter] = useState(() => new Set(DRAWDOWN_TYPES))
  const [advanced, setAdvanced] = useState({
    maxProfitTarget: '',
    maxDrawdown: '',
    maxDll: '',
    minConsistencyEval: '',
    minConsistencyFunded: '',
    minSplit: '',
    maxTradingDays: '',
    maxPayoutDays: '',
  })

  function updateAdvanced(field, value) {
    setAdvanced((prev) => ({ ...prev, [field]: value }))
  }

  function resetAdvanced() {
    setAdvanced({
      maxProfitTarget: '', maxDrawdown: '', maxDll: '', minConsistencyEval: '',
      minConsistencyFunded: '', minSplit: '', maxTradingDays: '', maxPayoutDays: '',
    })
    setDrawdownTypeFilter(new Set(DRAWDOWN_TYPES))
  }

  function toggleDrawdownType(t) {
    setDrawdownTypeFilter((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t); else next.add(t)
      return next
    })
  }

  function toggleFirm(id) {
    setFirmFilter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSize(size) {
    setSizeFilter((prev) => {
      const next = new Set(prev)
      if (next.has(size)) next.delete(size); else next.add(size)
      return next
    })
  }

  function toggleAllSizes() {
    setSizeFilter((prev) => (prev.size === ACCOUNT_SIZES.length ? new Set() : new Set(ACCOUNT_SIZES)))
  }

  const rows = useMemo(() => {
    const a = advanced
    const filtered = PROP_FIRM_OFFERS.filter((o) => firmFilter.has(o.firmId) && sizeFilter.has(o.size))
      .filter((o) => !noActivationOnly || o.activationFee === 0)
      .filter((o) => !noConsistencyFundedOnly || !o.consistencyFunded)
      .filter((o) => !onePassDayOnly || o.minTradingDays === 1)
      .filter((o) => drawdownTypeFilter.has(o.drawdownType))
      .filter((o) => !a.maxProfitTarget || o.profitTarget == null || o.profitTarget <= Number(a.maxProfitTarget))
      .filter((o) => !a.maxDrawdown || o.maxDrawdown <= Number(a.maxDrawdown))
      .filter((o) => !a.maxDll || o.dailyLossLimit == null || o.dailyLossLimit <= Number(a.maxDll))
      .filter((o) => !a.minConsistencyEval || (o.consistencyEval || 999) >= Number(a.minConsistencyEval))
      .filter((o) => !a.minConsistencyFunded || (o.consistencyFunded || 999) >= Number(a.minConsistencyFunded))
      .filter((o) => !a.minSplit || o.profitSplit >= Number(a.minSplit))
      .filter((o) => !a.maxTradingDays || (o.minTradingDays || 0) <= Number(a.maxTradingDays))
      .filter((o) => !a.maxPayoutDays || (o.payoutFrequencyDays ?? 999) <= Number(a.maxPayoutDays))
      .map((o) => ({ offer: o, effectivePrice: computeEffectivePrice(o, overrides[o.id]) }))

    if (sortByPrice) {
      filtered.sort((a2, b2) => {
        if (a2.effectivePrice == null) return 1
        if (b2.effectivePrice == null) return -1
        return a2.effectivePrice - b2.effectivePrice
      })
    }

    // Alterna una tinta leggera ogni volta che cambia la firm, per far capire visivamente
    // quali righe consecutive appartengono allo stesso gruppo (utile quando una firm ha più conti).
    let lastFirmId = null
    let parity = 0
    return filtered.map((r) => {
      if (r.offer.firmId !== lastFirmId) {
        parity = 1 - parity
        lastFirmId = r.offer.firmId
      }
      return { ...r, groupParity: parity }
    })
  }, [firmFilter, sizeFilter, overrides, sortByPrice, noActivationOnly, noConsistencyFundedOnly, onePassDayOnly, drawdownTypeFilter, advanced])

  const selectedOffer = selectedOfferId ? PROP_FIRM_OFFERS.find((o) => o.id === selectedOfferId) : null
  const selectedEffectivePrice = selectedOffer ? computeEffectivePrice(selectedOffer, overrides[selectedOffer.id]) : null

  function handleRowClick(e) {
    const tag = e.target.tagName
    if (tag === 'INPUT' || tag === 'BUTTON') return
    setSelectedOfferId(e.currentTarget.dataset.offerId)
  }

  return (
    <div className={styles.layout}>
      <PropFirmMatcher overrides={overrides} />

      <Card>
        <div className={styles.title}>Confronto Prop Firm</div>
        <p className={styles.subtitle}>
          Dati regole raccolti manualmente (luglio 2026), fermi finché non li aggiorni. Il prezzo di listino non riflette
          le promo attive: inserisci tu lo sconto % o il prezzo che vedi oggi sul sito per calcolare il prezzo effettivo.
        </p>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Prop firm</span>
            {FIRM_LIST.map((f) => (
              <label key={f.id} className={styles.checkboxPill}>
                <input type="checkbox" checked={firmFilter.has(f.id)} onChange={() => toggleFirm(f.id)} />
                <img src={f.logo} alt="" className={styles.logo} />
                {f.name}
              </label>
            ))}
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Size</span>
            <button className={styles.togglePill} onClick={toggleAllSizes}>
              {sizeFilter.size === ACCOUNT_SIZES.length ? 'Deseleziona tutte' : 'Tutte le size'}
            </button>
            {ACCOUNT_SIZES.map((s) => (
              <label key={s} className={styles.checkboxPill}>
                <input type="checkbox" checked={sizeFilter.has(s)} onChange={() => toggleSize(s)} />
                {(s / 1000)}k
              </label>
            ))}
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Altri filtri</span>
            <label className={styles.checkboxPill}>
              <input type="checkbox" checked={noActivationOnly} onChange={(e) => setNoActivationOnly(e.target.checked)} />
              No activation fee
            </label>
            <label className={styles.checkboxPill}>
              <input type="checkbox" checked={noConsistencyFundedOnly} onChange={(e) => setNoConsistencyFundedOnly(e.target.checked)} />
              No consistency funded
            </label>
            <label className={styles.checkboxPill}>
              <input type="checkbox" checked={onePassDayOnly} onChange={(e) => setOnePassDayOnly(e.target.checked)} />
              1 day pass
            </label>
          </div>
          <label className={styles.checkboxPill}>
            <input type="checkbox" checked={sortByPrice} onChange={(e) => setSortByPrice(e.target.checked)} />
            Ordina per prezzo effettivo
          </label>
          <button className={styles.togglePill} onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? 'Nascondi filtri avanzati' : 'Filtri avanzati'}
          </button>
        </div>

        {showAdvanced && (
          <div className={styles.advancedPanel}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Tipo drawdown</span>
              {DRAWDOWN_TYPES.map((t) => (
                <label key={t} className={styles.checkboxPill}>
                  <input type="checkbox" checked={drawdownTypeFilter.has(t)} onChange={() => toggleDrawdownType(t)} />
                  {t}
                </label>
              ))}
            </div>
            <div className={styles.advancedGrid}>
              <label className={styles.field}>
                <span>Profit target massimo ($)</span>
                <input type="number" value={advanced.maxProfitTarget} onChange={(e) => updateAdvanced('maxProfitTarget', e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Drawdown massimo ($)</span>
                <input type="number" value={advanced.maxDrawdown} onChange={(e) => updateAdvanced('maxDrawdown', e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Daily Loss Limit massimo ($)</span>
                <input type="number" value={advanced.maxDll} onChange={(e) => updateAdvanced('maxDll', e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Consistency eval minima (%)</span>
                <input type="number" value={advanced.minConsistencyEval} onChange={(e) => updateAdvanced('minConsistencyEval', e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Consistency funded minima (%)</span>
                <input type="number" value={advanced.minConsistencyFunded} onChange={(e) => updateAdvanced('minConsistencyFunded', e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Profit split minimo (%)</span>
                <input type="number" value={advanced.minSplit} onChange={(e) => updateAdvanced('minSplit', e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Giorni min. trading, massimo</span>
                <input type="number" value={advanced.maxTradingDays} onChange={(e) => updateAdvanced('maxTradingDays', e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Payout entro giorni, massimo</span>
                <input type="number" value={advanced.maxPayoutDays} onChange={(e) => updateAdvanced('maxPayoutDays', e.target.value)} />
              </label>
            </div>
            <button className={styles.resetBtn} onClick={resetAdvanced}>Reimposta filtri avanzati</button>
          </div>
        )}

        <p className={styles.tableHint}>
          Clicca su una riga per vedere tutti i dettagli del conto. Il pallino accanto al nome conto indica:{' '}
          <span className={styles.feeDotNone} /> nessuna activation fee ·{' '}
          <span className={styles.feeDotYes} /> activation fee presente ·{' '}
          <span className={styles.feeDotUnknown} /> non specificata
        </p>
      </Card>

      {selectedOffer && (
        <OfferDetailModal
          offer={selectedOffer}
          effectivePrice={selectedEffectivePrice}
          onClose={() => setSelectedOfferId(null)}
        />
      )}

      <Card>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Firm</th>
                <th>Conto</th>
                <th>Size</th>
                <th>Target</th>
                <th>Drawdown</th>
                <th>Tipo</th>
                <th>DLL</th>
                <th>Consistency (eval/funded)</th>
                <th>Split</th>
                <th>Difficoltà challenge</th>
                <th>Difficoltà payout</th>
                <th>Listino</th>
                <th>Sconto %</th>
                <th>Prezzo manuale</th>
                <th>Prezzo effettivo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ offer, effectivePrice, groupParity }) => {
                const ov = overrides[offer.id]
                const hasOverride = ov && ov.mode
                return (
                  <tr
                    key={offer.id}
                    className={`${styles.row} ${groupParity ? styles.rowGroupB : styles.rowGroupA}`}
                    title={offer.notes || ''}
                    data-offer-id={offer.id}
                    onClick={handleRowClick}
                  >
                    <td>
                      <div className={styles.firmCell}>
                        <img src={FIRM_BY_ID[offer.firmId].logo} alt="" className={styles.logo} />
                        {offer.firmName}
                      </div>
                    </td>
                    <td>
                      <span
                        className={
                          offer.activationFee === 0 ? styles.feeDotNone
                            : offer.activationFee ? styles.feeDotYes
                              : styles.feeDotUnknown
                        }
                        title={
                          offer.activationFee === 0 ? 'Nessuna activation fee'
                            : offer.activationFee ? `Activation fee: ${formatMoney(offer.activationFee)}`
                              : 'Activation fee non specificata, verifica sul sito'
                        }
                      />
                      {offer.accountType}
                    </td>
                    <td>{(offer.size / 1000)}k</td>
                    <td>{formatMoney(offer.profitTarget)}</td>
                    <td>{formatMoney(offer.maxDrawdown)}</td>
                    <td>{offer.drawdownType}</td>
                    <td>{formatMoney(offer.dailyLossLimit)}</td>
                    <td>{formatPct(offer.consistencyEval)} / {formatPct(offer.consistencyFunded)}</td>
                    <td>{formatPct(offer.profitSplit)}</td>
                    <td><DifficultyGauge compact score={computeChallengeDifficulty(offer)} /></td>
                    <td><DifficultyGauge compact score={computePayoutDifficulty(offer)} /></td>
                    <td>{formatMoney(offer.listinoPrice)}{offer.priceType === 'monthly' ? '/mese' : ''}</td>
                    <td>
                      <input
                        type="number"
                        className={styles.smallInput}
                        placeholder="%"
                        value={ov && ov.mode === 'discount' ? ov.discountPercent ?? '' : ''}
                        onChange={(e) => setDiscountPercent(offer.id, e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.smallInput}
                        placeholder="$"
                        value={ov && ov.mode === 'manual' ? ov.manualPrice ?? '' : ''}
                        onChange={(e) => setManualPrice(offer.id, e.target.value)}
                      />
                    </td>
                    <td className={hasOverride ? styles.priceEffective : styles.priceListino}>
                      {formatMoney(effectivePrice)}
                      {hasOverride && (
                        <button className={styles.clearBtn} onClick={() => clearOverride(offer.id)} title="Rimuovi override">
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
