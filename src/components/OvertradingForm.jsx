import { useState } from 'react'
import styles from './OvertradingForm.module.css'

const TRIGGERS = [
  'Loss iniziale', 'Revenge trading', 'FOMO', 'Noia', 'Rabbia',
  'Volevo recuperare', 'Ho ignorato il piano', 'Altro',
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY = {
  date: today(),
  accountIds: [],
  estimatedTradeCount: '',
  dailyPnL: '',
  lostControlAtTrade: '',
  mainTrigger: '',
  quickNote: '',
  tomorrowCorrection: '',
}

export default function OvertradingForm({ accounts, onSave }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleAccount(id) {
    setForm((prev) => ({
      ...prev,
      accountIds: prev.accountIds.includes(id)
        ? prev.accountIds.filter((x) => x !== id)
        : [...prev.accountIds, id],
    }))
  }

  function close() {
    setOpen(false)
    setForm(EMPTY)
    setSaveError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.accountIds.length === 0 || form.dailyPnL === '') return
    setSaveError('')
    setSaving(true)
    try {
      await onSave({
        date: form.date,
        accountIds: form.accountIds,
        estimatedTradeCount: form.estimatedTradeCount,
        dailyPnL: form.dailyPnL,
        lostControlAtTrade: form.lostControlAtTrade,
        mainTrigger: form.mainTrigger,
        quickNote: form.quickNote,
        tomorrowCorrection: form.tomorrowCorrection,
      })
    } catch (err) {
      setSaving(false)
      setSaveError(err.message || 'Salvataggio fallito, riprova.')
      return
    }
    setSaving(false)
    close()
  }

  if (accounts.length === 0) return null

  if (!open) {
    return (
      <button type="button" className={styles.triggerButton} onClick={() => setOpen(true)}>
        Ho fatto overtrading
      </button>
    )
  }

  return (
    <div className={styles.backdrop} onClick={close}>
      <form className={styles.panel} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <button type="button" className={styles.closeBtn} onClick={close} aria-label="Chiudi">×</button>

        <div className={styles.header}>
          <div className={styles.title}>Overtrading Mode</div>
          <p className={styles.subtitle}>Non serve ricostruire tutto. Salviamo almeno i dati essenziali.</p>
        </div>

        <label className={styles.label}>Data</label>
        <input
          className={styles.input}
          type="date"
          value={form.date}
          onChange={(e) => update('date', e.target.value)}
        />

        <label className={styles.label}>Conto/i</label>
        <div className={styles.accountList}>
          {accounts.map((a) => (
            <label key={a.id} className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={form.accountIds.includes(a.id)}
                onChange={() => toggleAccount(a.id)}
              />
              {a.name}
            </label>
          ))}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Numero approssimativo di trade fatti</label>
            <input
              className={styles.input}
              type="number"
              placeholder="Es. 8, 12, 16"
              value={form.estimatedTradeCount}
              onChange={(e) => update('estimatedTradeCount', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>P&L finale della giornata ($)</label>
            <input
              className={styles.input}
              type="number"
              step="0.01"
              placeholder="Es. -450"
              value={form.dailyPnL}
              onChange={(e) => update('dailyPnL', e.target.value)}
            />
          </div>
        </div>

        <label className={styles.label}>Da quale trade hai perso il controllo?</label>
        <input
          className={styles.input}
          type="number"
          placeholder="Es. dal terzo trade"
          value={form.lostControlAtTrade}
          onChange={(e) => update('lostControlAtTrade', e.target.value)}
        />

        <label className={styles.label}>Trigger principale dell'overtrading</label>
        <div className={styles.triggerGrid}>
          {TRIGGERS.map((t) => (
            <button
              type="button"
              key={t}
              className={`${styles.triggerPill} ${form.mainTrigger === t ? styles.triggerPillActive : ''}`}
              onClick={() => update('mainTrigger', t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className={styles.qualityNote}>Qualità dei dati della giornata: <strong>Bassa affidabilità</strong> — questo giorno non peserà nelle statistiche tecniche normali.</div>

        <label className={styles.label}>Cosa è successo oggi?</label>
        <textarea
          className={styles.textarea}
          rows={2}
          value={form.quickNote}
          onChange={(e) => update('quickNote', e.target.value)}
        />

        <label className={styles.label}>Domani cosa farai di diverso?</label>
        <textarea
          className={styles.textarea}
          rows={2}
          value={form.tomorrowCorrection}
          onChange={(e) => update('tomorrowCorrection', e.target.value)}
        />

        {saveError && <p className={styles.error}>Salvataggio fallito: {saveError}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={close}>Annulla</button>
          <button type="submit" className={styles.submitBtn} disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva giornata overtrading'}
          </button>
        </div>
      </form>
    </div>
  )
}
