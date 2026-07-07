import { useState } from 'react'
import styles from './PayoutForm.module.css'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function PayoutForm({ accounts, onSave }) {
  const [open, setOpen] = useState(false)
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!accountId || !amount || Number(amount) <= 0) return
    onSave({ accountId, date, amount })
    setAmount('')
    setOpen(false)
  }

  if (accounts.length === 0) return null

  if (!open) {
    return (
      <button type="button" className={styles.openButton} onClick={() => setOpen(true)}>
        Registra payout
      </button>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h3 className={styles.title}>Registra payout</h3>
        <button type="button" className={styles.closeButton} onClick={() => setOpen(false)}>✕</button>
      </div>

      <label className={styles.label}>Conto</label>
      <select className={styles.input} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        <option value="">Seleziona conto</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      <label className={styles.label}>Data</label>
      <input className={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      <label className={styles.label}>Importo ($)</label>
      <input
        className={styles.input}
        type="number"
        min="0"
        placeholder="es. 2000"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button type="submit" className={styles.submit}>Salva payout</button>
    </form>
  )
}
