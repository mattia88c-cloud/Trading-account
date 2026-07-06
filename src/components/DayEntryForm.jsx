import { useState } from 'react'
import styles from './DayEntryForm.module.css'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function DayEntryForm({ accounts, onSave }) {
  const [date, setDate] = useState(today())
  const [selectedIds, setSelectedIds] = useState([])
  const [profit, setProfit] = useState('')
  const [tradesOpened, setTradesOpened] = useState('')
  const [tradesEffective, setTradesEffective] = useState('')

  function toggleAccount(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (selectedIds.length === 0 || profit === '') return
    onSave({
      date,
      accountIds: selectedIds,
      profit,
      tradesOpened,
      tradesEffective,
    })
    setProfit('')
    setTradesOpened('')
    setTradesEffective('')
    setSelectedIds([])
  }

  if (accounts.length === 0) {
    return <p className={styles.empty}>Crea prima almeno un conto per registrare una giornata.</p>
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.title}>Registra giornata</h3>

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

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.label}>Trade aperti</label>
          <input
            className={styles.input}
            type="number"
            min="0"
            value={tradesOpened}
            onChange={(e) => setTradesOpened(e.target.value)}
          />
        </div>
        <div className={styles.col}>
          <label className={styles.label}>Trade effettivi</label>
          <input
            className={styles.input}
            type="number"
            min="0"
            value={tradesEffective}
            onChange={(e) => setTradesEffective(e.target.value)}
          />
        </div>
      </div>

      <button type="submit" className={styles.submit}>
        Salva giornata
      </button>
    </form>
  )
}
