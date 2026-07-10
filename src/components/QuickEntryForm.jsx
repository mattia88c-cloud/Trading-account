import { useState } from 'react'
import styles from './QuickEntryForm.module.css'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function QuickEntryForm({ accounts, onSave }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today())
  const [selectedIds, setSelectedIds] = useState([])
  const [profit, setProfit] = useState('')
  const [chartUrl, setChartUrl] = useState('')

  function toggleAccount(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (selectedIds.length === 0 || profit === '') return
    onSave({ date, accountIds: selectedIds, profit, chartUrl })
    setProfit('')
    setChartUrl('')
    setSelectedIds([])
    setOpen(false)
  }

  if (accounts.length === 0) {
    return <p className={styles.empty}>Crea prima almeno un conto per registrare una giornata.</p>
  }

  if (!open) {
    return (
      <button type="button" className={styles.openButton} onClick={() => setOpen(true)}>
        Registro rapido (senza dettagli)
      </button>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <h3 className={styles.title}>Registro giornata</h3>
        <button type="button" className={styles.closeButton} onClick={() => setOpen(false)}>✕</button>
      </div>

      <p className={styles.warning}>
        Solo data, conto e P&L: nessun dettaglio di trade, sessione, emozioni o strategia.
        Usa questo solo per casi eccezionali — per il journal di tutti i giorni preferisci
        "Journal trade" qui sotto, che dà dati molto più utili per le tue analytics.
      </p>

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
        placeholder="es. 250 o -120"
        value={profit}
        onChange={(e) => setProfit(e.target.value)}
      />

      <label className={styles.label}>Link screenshot (TradingView)</label>
      <input
        className={styles.input}
        type="url"
        placeholder="incolla qui il link «Get chart image» di TradingView"
        value={chartUrl}
        onChange={(e) => setChartUrl(e.target.value)}
      />

      <button type="submit" className={styles.submit}>
        Salva giornata
      </button>
    </form>
  )
}
