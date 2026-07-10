import { useState } from 'react'
import styles from './LoginPage.module.css'

export default function SetPasswordPage({ onUpdatePassword, onUpdateUsername, initialUsername, onSignOut }) {
  const [username, setUsername] = useState(initialUsername || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!username.trim()) {
      setError('Inserisci il tuo nome.')
      return
    }
    if (password.length < 8) {
      setError('La password deve avere almeno 8 caratteri.')
      return
    }
    if (password !== confirm) {
      setError('Le password non coincidono.')
      return
    }
    setBusy(true)
    // Nome prima: se fallisce, blocchiamo qui senza cambiare la password, così l'utente
    // non si ritrova a dover rifare da capo il login solo per correggere il nome.
    const { error: nameErr } = await onUpdateUsername(username.trim())
    if (nameErr) {
      setBusy(false)
      setError(nameErr.message)
      return
    }
    const { error: err } = await onUpdatePassword(password)
    setBusy(false)
    if (err) setError(err.message)
  }

  return (
    <div className={styles.page}>
      <div className={styles.ambientGlow} aria-hidden="true">
        <span className={styles.glowA} />
        <span className={styles.glowB} />
      </div>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Benvenuto</h1>
        <p className={styles.subtitle}>
          Il tuo account è stato creato con una password temporanea. Prima di continuare, dicci come ti chiami e imposta una nuova password.
        </p>

        <label className={styles.label}>Il tuo nome</label>
        <input
          className={styles.input}
          type="text"
          placeholder="es. Mattia"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label className={styles.label}>Nuova password (min. 8 caratteri)</label>
        <input
          className={styles.input}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label className={styles.label}>Conferma password</label>
        <input
          className={styles.input}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? '...' : 'Imposta password e continua'}
        </button>

        <button type="button" className={styles.linkBtn} onClick={onSignOut}>Logout</button>
      </form>
    </div>
  )
}
