import { useRef, useState } from 'react'
import styles from './CsvImportForm.module.css'

const TEMPLATE_CSV = 'Date,Profit,Symbol,Side\n2026-06-01,150.50,XAUUSD,Buy\n2026-06-01,-40,XAUUSD,Sell\n2026-06-02,220,NAS100,Buy\n'

export default function CsvImportForm({ accounts, onImport }) {
  const [open, setOpen] = useState(false)
  const [accountId, setAccountId] = useState('')
  const [message, setMessage] = useState(null)
  const fileInputRef = useRef(null)

  function handleDownloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'template-import.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file || !accountId) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = onImport(accountId, reader.result)
        setMessage({
          type: 'success',
          text: `Importate ${result.importedDays} giornate su ${result.totalRows} righe lette${result.skipped > 0 ? ` (${result.skipped} righe scartate: data o profitto non riconosciuti)` : ''}.`,
        })
      } catch (err) {
        setMessage({ type: 'error', text: err.message || 'Errore durante la lettura del CSV.' })
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  if (accounts.length === 0) return null

  if (!open) {
    return (
      <button type="button" className={styles.openButton} onClick={() => setOpen(true)}>
        Importa CSV conto passato
      </button>
    )
  }

  return (
    <div className={styles.form}>
      <div className={styles.header}>
        <h3 className={styles.title}>Importa CSV conto passato</h3>
        <button type="button" className={styles.closeButton} onClick={() => setOpen(false)}>✕</button>
      </div>

      <p className={styles.hint}>
        1. Seleziona il conto (creane uno prima se non esiste già). 2. Carica il CSV con lo storico dei trade —
        i giorni verranno riempiti con data e profitto; i campi non presenti nel file (sessione, emozioni, ecc.) resteranno vuoti.
      </p>

      <label className={styles.label}>Conto</label>
      <select className={styles.input} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
        <option value="">Seleziona conto</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      <button
        type="button"
        className={styles.fileButton}
        disabled={!accountId}
        onClick={() => fileInputRef.current?.click()}
      >
        Scegli file CSV
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className={styles.hiddenInput}
        onChange={handleFileChange}
      />

      <button type="button" className={styles.templateLink} onClick={handleDownloadTemplate}>
        Scarica CSV di esempio
      </button>

      {message && (
        <div className={message.type === 'error' ? styles.messageError : styles.messageSuccess}>
          {message.text}
        </div>
      )}
    </div>
  )
}
