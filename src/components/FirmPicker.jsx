import { useState } from 'react'
import { useFirmNames } from '../useFirmNames'
import styles from './FirmPicker.module.css'

export default function FirmPicker({ value, onChange, knownNames = [] }) {
  const { firmNames, addFirmName, removeFirmName } = useFirmNames()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Oltre ai nomi salvati a mano (locali al browser), mostra anche le firm già presenti nei
  // dati (acquisti/payout esistenti): così il picker non risulta vuoto su un browser diverso
  // da quello con cui li avevi aggiunti la prima volta.
  const displayNames = [...new Set([...firmNames, ...knownNames])]

  function handleSave() {
    const trimmed = draft.trim()
    if (!trimmed) {
      setAdding(false)
      return
    }
    addFirmName(trimmed)
    onChange(trimmed)
    setDraft('')
    setAdding(false)
  }

  function handleConfirmDelete(name) {
    if (value === name) onChange('')
    removeFirmName(name)
    setConfirmDelete(null)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.group}>
        {displayNames.map((name) => {
          const removable = firmNames.includes(name)
          return confirmDelete === name ? (
            <span key={name} className={styles.confirmChip}>
              Eliminare "{name}"?
              <button type="button" className={styles.confirmYes} onClick={() => handleConfirmDelete(name)}>Sì</button>
              <button type="button" className={styles.confirmNo} onClick={() => setConfirmDelete(null)}>No</button>
            </span>
          ) : (
            <span key={name} className={styles.optionWrap}>
              <button
                type="button"
                className={`${styles.option} ${value === name ? styles.optionActive : ''}`}
                onClick={() => onChange(value === name ? '' : name)}
              >
                {name}
              </button>
              {removable && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  title={`Elimina "${name}"`}
                  aria-label={`Elimina "${name}"`}
                  onClick={() => setConfirmDelete(name)}
                >
                  ×
                </button>
              )}
            </span>
          )
        })}
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setAdding(true)}
          title="Aggiungi nuova prop firm"
          aria-label="Aggiungi nuova prop firm"
        >
          +
        </button>
      </div>
      {adding && (
        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            type="text"
            placeholder="Nome prop firm"
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
