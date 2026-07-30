import { useState } from 'react'
import { BALANCE_PRESETS, DRAWDOWN_BY_PRESET } from '../useTradingData'
import styles from './AccountForm.module.css'

export default function AccountForm({ onCreate }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('propfirm')
  const [name, setName] = useState('')
  const [preset, setPreset] = useState(BALANCE_PRESETS[0])
  const [customBalance, setCustomBalance] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [customDrawdown, setCustomDrawdown] = useState('')
  const [fixedThreshold, setFixedThreshold] = useState(false)
  const [thresholdValue, setThresholdValue] = useState('')
  const [accountStage, setAccountStage] = useState('challenge')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const initialBalance = useCustom ? customBalance : preset
    if (!name.trim() || !initialBalance || Number(initialBalance) <= 0) return
    if (useCustom && fixedThreshold && (!thresholdValue || Number(thresholdValue) <= 0)) return
    const maxDrawdown = useCustom ? customDrawdown : DRAWDOWN_BY_PRESET[preset]
    setSaveError('')
    setSaving(true)
    const created = await onCreate({
      name: name.trim(),
      type,
      initialBalance,
      maxDrawdown,
      fixedThreshold: useCustom && fixedThreshold,
      thresholdValue: useCustom && fixedThreshold ? thresholdValue : null,
      accountStage: type === 'propfirm' ? accountStage : null,
    })
    setSaving(false)
    // onCreate torna null se il salvataggio è fallito (es. colonna non ancora migrata sul
    // database): senza questo controllo il form si chiudeva comunque, dando l'impressione che
    // il conto fosse stato creato quando in realtà non esisteva da nessuna parte.
    if (!created) {
      setSaveError('Salvataggio fallito. Controlla la connessione o riprova.')
      return
    }
    setName('')
    setCustomBalance('')
    setUseCustom(false)
    setCustomDrawdown('')
    setFixedThreshold(false)
    setThresholdValue('')
    setAccountStage('challenge')
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
          className={`${styles.toggle} ${type === 'propfirm' ? styles.active : ''}`}
          onClick={() => setType('propfirm')}
        >
          Prop Firm
        </button>
        <button
          type="button"
          className={`${styles.toggle} ${type === 'personal' ? styles.active : ''}`}
          onClick={() => setType('personal')}
        >
          Personale
        </button>
      </div>

      {type === 'propfirm' && (
        <div className={styles.toggleGroup}>
          <button
            type="button"
            className={`${styles.toggle} ${accountStage === 'challenge' ? styles.active : ''}`}
            onClick={() => setAccountStage('challenge')}
          >
            Challenge
          </button>
          <button
            type="button"
            className={`${styles.toggle} ${accountStage === 'funded' ? styles.active : ''}`}
            onClick={() => setAccountStage('funded')}
          >
            Funded
          </button>
        </div>
      )}

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

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={fixedThreshold}
              onChange={(e) => setFixedThreshold(e.target.checked)}
            />
            Threshold fisso (non insegue il saldo che cresce) — per conti CFD
          </label>

          {fixedThreshold ? (
            <input
              className={styles.input}
              type="number"
              min="0"
              placeholder="Valore threshold fisso ($)"
              value={thresholdValue}
              onChange={(e) => setThresholdValue(e.target.value)}
            />
          ) : (
            <input
              className={styles.input}
              type="number"
              min="0"
              placeholder="Drawdown massimo ($) - opzionale"
              value={customDrawdown}
              onChange={(e) => setCustomDrawdown(e.target.value)}
            />
          )}
        </>
      ) : (
        <div className={styles.drawdownInfo}>
          Drawdown massimo: ${DRAWDOWN_BY_PRESET[preset].toLocaleString('it-IT')}
        </div>
      )}

      {saveError && <div className={styles.saveError}>{saveError}</div>}

      <button type="submit" className={styles.submit} disabled={saving}>
        {saving ? 'Salvataggio…' : 'Crea conto'}
      </button>
    </form>
  )
}
