import { useState } from 'react'
import { BALANCE_PRESETS } from '../useTradingData'
import styles from './AccountForm.module.css'

export default function AccountForm({ onCreate }) {
  const [type, setType] = useState('personal')
  const [name, setName] = useState('')
  const [preset, setPreset] = useState(BALANCE_PRESETS[0])
  const [customBalance, setCustomBalance] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const initialBalance = useCustom ? customBalance : preset
    if (!name.trim() || !initialBalance || Number(initialBalance) <= 0) return
    onCreate({ name: name.trim(), type, initialBalance })
    setName('')
    setCustomBalance('')
    setUseCustom(false)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.title}>Nuovo conto</h3>

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

      {useCustom && (
        <input
          className={styles.input}
          type="number"
          placeholder="Saldo iniziale ($)"
          value={customBalance}
          onChange={(e) => setCustomBalance(e.target.value)}
        />
      )}

      <button type="submit" className={styles.submit}>
        Crea conto
      </button>
    </form>
  )
}
