import { useRef, useState } from 'react'
import styles from './DataBackup.module.css'

export default function DataBackup({ exportData, importData }) {
  const fileInputRef = useRef(null)
  const [message, setMessage] = useState('')

  function handleExport() {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const today = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `trading-accounts-backup-${today}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      const confirmed = window.confirm(
        'I conti e le giornate di questo file verranno aggiunti al tuo account (non sovrascrivono quelli già presenti). Continuare?'
      )
      if (!confirmed) {
        e.target.value = ''
        return
      }
      setMessage('Importazione in corso…')
      try {
        await importData(reader.result)
        setMessage('Import completato con successo.')
      } catch {
        setMessage('Errore: file di backup non valido.')
      }
      e.target.value = ''
      setTimeout(() => setMessage(''), 4000)
    }
    reader.readAsText(file)
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.button} onClick={handleExport}>
        Esporta dati
      </button>
      <button type="button" className={styles.button} onClick={handleImportClick}>
        Importa dati
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className={styles.hiddenInput}
        onChange={handleFileChange}
      />
      {message && <span className={styles.message}>{message}</span>}
    </div>
  )
}
