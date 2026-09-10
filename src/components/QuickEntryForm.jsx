import { useState } from 'react'
import StrategyPicker from './StrategyPicker.jsx'
import { useHints } from '../useHints.jsx'
import LandingActionButton from './LandingActionButton.jsx'
import styles from './QuickEntryForm.module.css'

const quickEntryIcon = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13,2 3,14 11,14 11,22 21,10 13,10" />
  </svg>
)

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function QuickEntryForm({ accounts, onSave }) {
  const { hintsEnabled } = useHints()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today())
  const [selectedIds, setSelectedIds] = useState([])
  const [profit, setProfit] = useState('')
  const [strategy, setStrategy] = useState('')
  const [tradesWon, setTradesWon] = useState('')
  const [tradesLost, setTradesLost] = useState('')
  const [riskReward, setRiskReward] = useState('')
  const [chartUrl, setChartUrl] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleAccount(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (selectedIds.length === 0 || profit === '') return
    setSaveError('')
    setSaving(true)
    try {
      await onSave({ date, accountIds: selectedIds, profit, strategy, tradesWon, tradesLost, riskReward, chartUrl })
    } catch (err) {
      setSaving(false)
      setSaveError(err.message || 'Salvataggio fallito, riprova.')
      return
    }
    setSaving(false)
    setProfit('')
    setStrategy('')
    setTradesWon('')
    setTradesLost('')
    setRiskReward('')
    setChartUrl('')
    setSelectedIds([])
    setOpen(false)
  }

  if (accounts.length === 0) {
    return <p className={styles.empty}>Crea prima almeno un conto per registrare una giornata.</p>
  }

  if (!open) {
    return (
      <LandingActionButton
        icon={quickEntryIcon}
        title="Registro rapido"
        subtitle="Solo data, conto e P&L, in pochi secondi"
        tone="success"
        onClick={() => setOpen(true)}
      />
    )
  }

  return (
    <div className={styles.backdrop} onClick={() => setOpen(false)}>
    <form className={styles.form} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <h3 className={styles.title}>Registro giornata</h3>
        <button type="button" className={styles.closeButton} onClick={() => setOpen(false)}>✕</button>
      </div>

      {hintsEnabled && (
        <p className={styles.warning}>
          Solo data, conto e P&L: nessun dettaglio di trade, sessione, emozioni o strategia.
          Usa questo solo per casi eccezionali — per il journal di tutti i giorni preferisci
          "Journal trade" qui sotto, che dà dati molto più utili per le tue analytics.
        </p>
      )}

      <label className={styles.label}>Data</label>
      <input
        className={styles.input}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <label className={styles.label}>Conto/i (seleziona uno o più per copy trading)</label>
      <div className={styles.accountList}>
        {accounts.map((a) => (
          <label key={a.id} className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={selectedIds.includes(a.id)}
              onChange={() => toggleAccount(a.id)}
            />
            {a.name}
          </label>
        ))}
      </div>

      <label className={styles.label}>Profitto / Perdita ($)</label>
      <input
        className={styles.input}
        type="number"
        step="0.01"
        placeholder={hintsEnabled ? 'es. 250 o -120' : ''}
        value={profit}
        onChange={(e) => setProfit(e.target.value)}
      />

      <label className={styles.label}>Strategia</label>
      <StrategyPicker value={strategy} onChange={setStrategy} />

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.label}>Trade vinti</label>
          <input
            className={styles.input}
            type="number"
            min="0"
            placeholder={hintsEnabled ? 'es. 2' : ''}
            value={tradesWon}
            onChange={(e) => setTradesWon(e.target.value)}
          />
        </div>
        <div className={styles.col}>
          <label className={styles.label}>Trade persi</label>
          <input
            className={styles.input}
            type="number"
            min="0"
            placeholder={hintsEnabled ? 'es. 1' : ''}
            value={tradesLost}
            onChange={(e) => setTradesLost(e.target.value)}
          />
        </div>
        <div className={styles.col}>
          <label className={styles.label}>RR</label>
          <input
            className={styles.input}
            type="number"
            step="0.1"
            placeholder={hintsEnabled ? 'es. 2.5' : ''}
            value={riskReward}
            onChange={(e) => setRiskReward(e.target.value)}
          />
        </div>
      </div>

      <label className={styles.label}>Link screenshot (TradingView)</label>
      <input
        className={styles.input}
        type="url"
        placeholder={hintsEnabled ? 'incolla qui il link «Get chart image» di TradingView' : ''}
        value={chartUrl}
        onChange={(e) => setChartUrl(e.target.value)}
      />

      {saveError && <p className={styles.error}>Salvataggio fallito: {saveError}</p>}

      <button type="submit" className={styles.submit} disabled={saving}>
        {saving ? 'Salvataggio…' : 'Salva giornata'}
      </button>
    </form>
    </div>
  )
}
