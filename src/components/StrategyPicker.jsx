import { useState } from 'react'
import { useStrategies } from '../useStrategies'
import styles from './StrategyPicker.module.css'

export default function StrategyPicker({ value, onChange }) {
  const { strategies, addStrategy, removeStrategy } = useStrategies()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  function handleSave() {
    const trimmed = draft.trim()
    if (!trimmed) {
      setAdding(false)
      return
    }
    addStrategy(trimmed)
    onChange(trimmed)
    setDraft('')
    setAdding(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.group}>
        {strategies.map((s) => (
          <span key={s} className={styles.optionWrap}>
            <button
              type="button"
              className={`${styles.option} ${value === s ? styles.optionActive : ''}`}
              onClick={() => onChange(value === s ? '' : s)}
            >
              {s}
            </button>
            <button
              type="button"
              className={styles.removeBtn}
              title={`Elimina strategia "${s}"`}
              aria-label={`Elimina strategia "${s}"`}
              onClick={() => {
                if (value === s) onChange('')
                removeStrategy(s)
              }}
            >
              ×
            </button>
          </span>
        ))}
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setAdding(true)}
          title="Aggiungi nuova strategia"
          aria-label="Aggiungi nuova strategia"
        >
          +
        </button>
      </div>
      {adding && (
        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            type="text"
            placeholder="Nome strategia"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSave() }
              if (e.key === 'Escape') { setAdding(false); setDraft('') }
            }}
          />
          <button type="button" className={styles.saveBtn} onClick={handleSave}>Salva</button>
          <button type="button" className={styles.cancelBtn} onClick={() => { setAdding(false); setDraft('') }}>✕</button>
        </div>
      )}
    </div>
  )
}
