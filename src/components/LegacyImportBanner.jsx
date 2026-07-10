import { useState } from 'react'
import Card from './Card'
import { readLegacyLocalData, clearLegacyLocalData } from '../useTradingData'
import styles from './LegacyImportBanner.module.css'

// Dopo il passaggio a Supabase (Stadio B), i dati creati prima con solo localStorage restano
// nel browser ma l'app non li legge più da lì. Questo banner li rileva una volta e offre di
// spostarli nell'account cloud dell'utente con un click, riusando lo stesso importData().
export default function LegacyImportBanner({ importData }) {
  const [legacyData] = useState(() => readLegacyLocalData())
  const [status, setStatus] = useState('idle') // idle | importing | done | error
  const [dismissed, setDismissed] = useState(false)

  if (!legacyData || dismissed || status === 'done') return null

  async function handleImport() {
    setStatus('importing')
    try {
      await importData(JSON.stringify({ ...legacyData, exportedAt: new Date().toISOString() }))
      clearLegacyLocalData()
      setStatus('done')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Errore import dati legacy:', err)
      setStatus('error')
    }
  }

  function handleDismiss() {
    clearLegacyLocalData()
    setDismissed(true)
  }

  return (
    <Card className={styles.card}>
      <div className={styles.title}>Dati trovati in questo browser</div>
      <p className={styles.text}>
        Ho trovato {legacyData.accounts.length} cont{legacyData.accounts.length === 1 ? 'o' : 'i'} e{' '}
        {legacyData.entries.length} giornate salvate in locale prima del passaggio all'account cloud.
        Vuoi importarle nel tuo account?
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.importBtn} onClick={handleImport} disabled={status === 'importing'}>
          {status === 'importing' ? 'Importazione…' : 'Importa nel mio account'}
        </button>
        <button type="button" className={styles.dismissBtn} onClick={handleDismiss}>
          Ignora
        </button>
      </div>
      {status === 'error' && <p className={styles.error}>Import fallito, riprova o contattami.</p>}
    </Card>
  )
}
