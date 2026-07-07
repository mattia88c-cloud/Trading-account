import { useState } from 'react'
import { BALANCE_PRESETS, DRAWDOWN_BY_PRESET } from '../useTradingData'
import styles from './AccountForm.module.css'

export default function AccountForm({ onCreate }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('personal')
  const [name, setName] = useState('')
  const [preset, setPreset] = useState(BALANCE_PRESETS[0])
  const [customBalance, setCustomBalance] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [customDrawdown, setCustomDrawdown] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const initialBalance = useCustom ? customBalance : preset
    if (!name.trim() || !initialBalance || Number(initialBalance) <= 0) return
    const maxDrawdown = useCustom ? customDrawdown : DRAWDOWN_BY_PRESET[preset]
    onCreate({ name: name.trim(), type, initialBalance, maxDrawdown })
    setName('')
    setCustomBalance('')
    setUseCustom(false)
    setCustomDrawdown('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" className={styles.openButton} onClick={() => setOpen(true)}>
        + Nuovo conto
      </button>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <h3 className={styles.title}>Nuovo conto</h3>
        <button type="button" className={styles.closeButton} onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>

      <div className={styles.toggleGroup}>
        <button
          type="button"
          className={`${styles.toggle} ${type === 'personal' ? styles.active : ''}`}
          onClick={() => setType('personal')}
        >
          Personale
        </button>
        <button
          type="button"
          className={`${styles.toggle} ${type === 'propfirm' ? styles.active : ''}`}
          onClick={() => setType('propfirm')}
        >
          Prop Firm
        </button>
      </div>

      <input
        className={styles.input}
        type="text"
        placeholder="Nome conto"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className={styles.balanceRow}>
        {BALANCE_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className={`${styles.preset} ${!useCustom && preset === p ? styles.active : ''}`}
            onClick={() => {
              setPreset(p)
              setUseCustom(false)
            }}
          >
            {(p / 1000).toFixed(0)}k
          </button>
        ))}
        <button
          type="button"
          className={`${styles.preset} ${useCustom ? styles.active : ''}`}
          onClick={() => setUseCustom(true)}
        >
          Custom
        </button>
      </div>

      {useCustom ? (
        <>
          <input
            className={styles.input}
            type="number"
            placeholder="Saldo iniziale ($)"
            value={customBalance}
            onChange={(e) => setCustomBalance(e.target.value)}
          />
          <input
            className={styles.input}
            type="number"
            min="0"
            placeholder="Drawdown massimo ($) - opzionale"
            value={customDrawdown}
            onChange={(e) => setCustomDrawdown(e.target.value)}
          />
        </>
      ) : (
        <div className={styles.drawdownInfo}>
          Drawdown massimo: ${DRAWDOWN_BY_PRESET[preset].toLocaleString('it-IT')}
        </div>
      )}

      <button type="submit" className={styles.submit}>
        Crea conto
      </button>
    </form>
  )
}
