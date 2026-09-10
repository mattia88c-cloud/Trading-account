import { useState } from 'react'
import Card from './Card'
import FirmPicker from './FirmPicker.jsx'
import CollapseToggle from './CollapseToggle.jsx'
import { useHints } from '../useHints.jsx'
import { useCollapsed } from '../useCollapsed.js'
import styles from './PropRoiView.module.css'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtMoney(n, currency = '$') {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `${currency}${n.toLocaleString('it-IT', { maximumFractionDigits: 2 })}`
}

export default function PropRoiView({ purchases, payouts, addPurchase, deletePurchase, addPayout, deletePayout }) {
  const { hintsEnabled } = useHints()

  const [purchaseFormOpen, togglePurchaseForm] = useCollapsed('propRoi:purchaseForm')
  const [payoutFormOpen, togglePayoutForm] = useCollapsed('propRoi:payoutForm')
  const [purchaseHistoryOpen, togglePurchaseHistory] = useCollapsed('propRoi:purchaseHistory')
  const [payoutHistoryOpen, togglePayoutHistory] = useCollapsed('propRoi:payoutHistory')

  const [purchaseFirm, setPurchaseFirm] = useState('')
  const [purchaseCurrency, setPurchaseCurrency] = useState('EUR')
  const [purchaseSize, setPurchaseSize] = useState('')
  const [purchaseCost, setPurchaseCost] = useState('')
  const [purchaseActivationFee, setPurchaseActivationFee] = useState('')
  const [purchaseResetCost, setPurchaseResetCost] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(today())
  const [purchaseSaving, setPurchaseSaving] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')

  const [payoutFirm, setPayoutFirm] = useState('')
  const [payoutGross, setPayoutGross] = useState('')
  const [payoutTax, setPayoutTax] = useState('')
  const [payoutNet, setPayoutNet] = useState('')
  const [payoutDate, setPayoutDate] = useState(today())
  const [payoutSaving, setPayoutSaving] = useState(false)
  const [payoutError, setPayoutError] = useState('')

  async function handlePurchaseSubmit(e) {
    e.preventDefault()
    // Costo, activation fee e costo di reset sono tre spese indipendenti: basta che almeno una
    // sia valorizzata per poter salvare (es. registrare solo un reset pagato, senza dover per
    // forza comprare anche un conto nella stessa riga, e viceversa).
    const hasCost = purchaseCost && Number(purchaseCost) > 0
    const hasActivationFee = purchaseActivationFee && Number(purchaseActivationFee) > 0
    const hasResetCost = purchaseResetCost && Number(purchaseResetCost) > 0
    if (!purchaseFirm.trim() || (!hasCost && !hasActivationFee && !hasResetCost)) return
    setPurchaseError('')
    setPurchaseSaving(true)
    try {
      await addPurchase({
        firmName: purchaseFirm.trim(),
        size: purchaseSize,
        cost: hasCost ? purchaseCost : 0,
        activationFee: purchaseActivationFee,
        resetCost: purchaseResetCost,
        currency: purchaseCurrency,
        date: purchaseDate,
      })
    } catch (err) {
      setPurchaseSaving(false)
      setPurchaseError(err.message || 'Salvataggio fallito, riprova.')
      return
    }
    setPurchaseSaving(false)
    setPurchaseFirm('')
    setPurchaseSize('')
    setPurchaseCost('')
    setPurchaseActivationFee('')
    setPurchaseResetCost('')
    setPurchaseCurrency('EUR')
    setPurchaseDate(today())
  }

  async function handlePayoutSubmit(e) {
    e.preventDefault()
    if (!payoutFirm.trim() || !payoutGross || Number(payoutGross) <= 0) return
    setPayoutError('')
    setPayoutSaving(true)
    try {
      await addPayout({
        firmName: payoutFirm.trim(),
        grossAmount: payoutGross,
        taxEur: payoutTax,
        netAmountEur: payoutNet,
        date: payoutDate,
      })
    } catch (err) {
      setPayoutSaving(false)
      setPayoutError(err.message || 'Salvataggio fallito, riprova.')
      return
    }
    setPayoutSaving(false)
    setPayoutFirm('')
    setPayoutGross('')
    setPayoutTax('')
    setPayoutNet('')
    setPayoutDate(today())
  }

  const knownFirmNames = [...new Set([...purchases.map((p) => p.firmName), ...payouts.map((p) => p.firmName)])]

  return (
    <div className={styles.wrap}>
      <div className={styles.formsRow}>
        <Card className={styles.formCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.title}>Aggiungi acquisto</h3>
            <CollapseToggle open={purchaseFormOpen} onToggle={togglePurchaseForm} />
          </div>
          {purchaseFormOpen && (
            <>
              {hintsEnabled && (
                <p className={styles.hint}>
                  Ogni volta che compri un conto/valutazione da una prop firm. Costo, activation fee e costo di
                  reset sono indipendenti: puoi salvare anche solo una fee/reset senza comprare un conto, o
                  viceversa — basta compilare almeno uno dei tre importi.
                </p>
              )}
              <form onSubmit={handlePurchaseSubmit} className={styles.form}>
                <label className={styles.label}>Prop firm</label>
                <FirmPicker value={purchaseFirm} onChange={setPurchaseFirm} knownNames={knownFirmNames} />
                <label className={styles.label}>Valuta di costo/fee/reset</label>
                <div className={styles.toggleGroup}>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${purchaseCurrency === 'EUR' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setPurchaseCurrency('EUR')}
                  >
                    €
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${purchaseCurrency === 'USD' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setPurchaseCurrency('USD')}
                  >
                    $
                  </button>
                </div>
                {(() => {
                  const sym = purchaseCurrency === 'USD' ? '$' : '€'
                  return (
                    <>
                      <div className={styles.row}>
                        <div className={styles.col}>
                          <label className={styles.label}>Size ($)</label>
                          <input
                            className={styles.input}
                            type="number"
                            min="0"
                            placeholder={hintsEnabled ? 'es. 50000' : ''}
                            value={purchaseSize}
                            onChange={(e) => setPurchaseSize(e.target.value)}
                          />
                        </div>
                        <div className={styles.col}>
                          <label className={styles.label}>Costo ({sym})</label>
                          <input
                            className={styles.input}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={hintsEnabled ? 'es. 89' : ''}
                            value={purchaseCost}
                            onChange={(e) => setPurchaseCost(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className={styles.row}>
                        <div className={styles.col}>
                          <label className={styles.label}>Activation fee ({sym})</label>
                          <input
                            className={styles.input}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={hintsEnabled ? 'es. 30 (lascia vuoto se non pagata)' : ''}
                            value={purchaseActivationFee}
                            onChange={(e) => setPurchaseActivationFee(e.target.value)}
                          />
                        </div>
                        <div className={styles.col}>
                          <label className={styles.label}>Costo reset ({sym})</label>
                          <input
                            className={styles.input}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={hintsEnabled ? 'es. 50 (lascia vuoto se nessun reset)' : ''}
                            value={purchaseResetCost}
                            onChange={(e) => setPurchaseResetCost(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )
                })()}
                <label className={styles.label}>Data</label>
                <input className={styles.input} type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
                {purchaseError && <p className={styles.error}>{purchaseError}</p>}
                <button type="submit" className={styles.submit} disabled={purchaseSaving}>
                  {purchaseSaving ? 'Salvataggio…' : 'Salva acquisto'}
                </button>
              </form>
            </>
          )}
        </Card>

        <Card className={styles.formCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.title}>Aggiungi payout</h3>
            <CollapseToggle open={payoutFormOpen} onToggle={togglePayoutForm} />
          </div>
          {payoutFormOpen && (
            <>
              {hintsEnabled && <p className={styles.hint}>Il "netto" è quanto ti è rimasto in euro dopo commissioni/cambio — lascialo vuoto se coincide col lordo.</p>}
              <form onSubmit={handlePayoutSubmit} className={styles.form}>
                <label className={styles.label}>Prop firm</label>
                <FirmPicker value={payoutFirm} onChange={setPayoutFirm} knownNames={knownFirmNames} />
                <div className={styles.row}>
                  <div className={styles.col}>
                    <label className={styles.label}>Payout ricevuto ($)</label>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={hintsEnabled ? 'es. 1200' : ''}
                      value={payoutGross}
                      onChange={(e) => setPayoutGross(e.target.value)}
                    />
                  </div>
                  <div className={styles.col}>
                    <label className={styles.label}>Netto (€)</label>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={hintsEnabled ? 'es. 1080' : ''}
                      value={payoutNet}
                      onChange={(e) => setPayoutNet(e.target.value)}
                    />
                  </div>
                </div>
                <label className={styles.label}>Tax (€)</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={hintsEnabled ? 'es. 240' : ''}
                  value={payoutTax}
                  onChange={(e) => setPayoutTax(e.target.value)}
                />
                <label className={styles.label}>Data</label>
                <input className={styles.input} type="date" value={payoutDate} onChange={(e) => setPayoutDate(e.target.value)} />
                {payoutError && <p className={styles.error}>{payoutError}</p>}
                <button type="submit" className={styles.submit} disabled={payoutSaving}>
                  {payoutSaving ? 'Salvataggio…' : 'Salva payout'}
                </button>
              </form>
            </>
          )}
        </Card>
      </div>

      {(purchases.length > 0 || payouts.length > 0) && (
        <div className={styles.historyRow}>
          <Card className={styles.historyCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.title}>Acquisti</h3>
              <CollapseToggle open={purchaseHistoryOpen} onToggle={togglePurchaseHistory} />
            </div>
            {purchaseHistoryOpen && (
              purchases.length === 0 ? (
                <p className={styles.empty}>Nessun acquisto registrato.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Prop firm</th>
                        <th>Size</th>
                        <th>Costo</th>
                        <th>Activation fee</th>
                        <th>Costo reset</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((p) => {
                        const sym = p.currency === 'USD' ? '$' : '€'
                        return (
                        <tr key={p.id}>
                          <td className={styles.historyDate}>{p.date}</td>
                          <td className={styles.firmCell}>{p.firmName}</td>
                          <td>{p.size ? `$${p.size.toLocaleString('it-IT')}` : '—'}</td>
                          <td className={styles.negative}>{p.cost ? fmtMoney(p.cost, sym) : '—'}</td>
                          <td className={styles.negative}>{p.activationFee ? fmtMoney(p.activationFee, sym) : '—'}</td>
                          <td className={styles.negative}>{p.resetCost ? fmtMoney(p.resetCost, sym) : '—'}</td>
                          <td>
                            <button type="button" className={styles.deleteBtn} onClick={() => deletePurchase(p.id)} aria-label="Elimina">×</button>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </Card>

          <Card className={styles.historyCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.title}>Payout</h3>
              <CollapseToggle open={payoutHistoryOpen} onToggle={togglePayoutHistory} />
            </div>
            {payoutHistoryOpen && (
              payouts.length === 0 ? (
                <p className={styles.empty}>Nessun payout registrato.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Prop firm</th>
                        <th>Lordo</th>
                        <th>Tax</th>
                        <th>Netto</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p) => (
                        <tr key={p.id}>
                          <td className={styles.historyDate}>{p.date}</td>
                          <td className={styles.firmCell}>{p.firmName}</td>
                          <td className={styles.positive}>{fmtMoney(p.grossAmount)}</td>
                          <td className={styles.negative}>{p.taxEur ? fmtMoney(p.taxEur, '€') : '—'}</td>
                          <td className={styles.positive}>{p.netAmountEur !== null ? fmtMoney(p.netAmountEur, '€') : '—'}</td>
                          <td>
                            <button type="button" className={styles.deleteBtn} onClick={() => deletePayout(p.id)} aria-label="Elimina">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </Card>
        </div>
      )}

    </div>
  )
}
