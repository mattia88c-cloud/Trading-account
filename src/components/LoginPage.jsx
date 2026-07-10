import { useState } from 'react'
import styles from './LoginPage.module.css'

export default function LoginPage({ onSignIn, onResetPassword }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'reset'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)

    if (mode === 'reset') {
      const { error: err } = await onResetPassword(email)
      setBusy(false)
      if (err) setError(err.message)
      else setInfo('Se l\'indirizzo esiste, ti abbiamo inviato un\'email per reimpostare la password.')
      return
    }

    const { error: err } = await onSignIn(email, password)
    setBusy(false)
    if (err) setError('Email o password non corrette.')
  }

  return (
    <div className={styles.page}>
      <div className={styles.ambientGlow} aria-hidden="true">
        <span className={styles.glowA} />
        <span className={styles.glowB} />
      </div>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Stratton Account Manager</h1>
        <p className={styles.subtitle}>
          {mode === 'login' ? 'Accedi al tuo account' : 'Reimposta la password'}
        </p>

        <label className={styles.label}>Email</label>
        <input
          className={styles.input}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {mode === 'login' && (
          <>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}
        {info && <p className={styles.info}>{info}</p>}

        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? '...' : mode === 'login' ? 'Accedi' : 'Invia email di reset'}
        </button>

        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => { setMode(mode === 'login' ? 'reset' : 'login'); setError(''); setInfo('') }}
        >
          {mode === 'login' ? 'Password dimenticata?' : '← Torna al login'}
        </button>
      </form>
    </div>
  )
}
