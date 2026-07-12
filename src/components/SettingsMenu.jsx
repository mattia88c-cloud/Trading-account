import { useEffect, useRef, useState } from 'react'
import styles from './SettingsMenu.module.css'

const gearIcon = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
}

const DELETE_CONFIRM_WORD = 'ELIMINA'

export default function SettingsMenu({
  profile, isAdmin, onUpdatePassword, onUpdateUsername, onReauthenticate, onOpenAdmin, onDeleteAllData, onSignOut,
  sfxMuted, onToggleSfx, motionDisabled, onToggleMotion,
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('menu') // 'menu' | 'password' | 'profile' | 'adminAuth' | 'deleteData' | 'preferences'
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState(profile?.username || '')
  const [adminPassword, setAdminPassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const wrapRef = useRef(null)

  function resetForms() {
    setView('menu')
    setPassword('')
    setConfirmPassword('')
    setUsername(profile?.username || '')
    setAdminPassword('')
    setDeleteConfirmText('')
    setError('')
    setSuccess('')
  }

  function toggle() {
    setOpen((v) => !v)
    resetForms()
  }

  function close() {
    setOpen(false)
    resetForms()
  }

  // Il dropdown restava aperto all'infinito (anche cambiando sezione): si chiude solo cliccando
  // di nuovo sulla rotellina. Chiudiamo anche cliccando fuori dal box, comportamento standard
  // per un menu a tendina.
  useEffect(() => {
    if (!open) return
    function handleOutsideClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close()
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  function goTo(nextView) {
    setView(nextView)
    setError('')
    setSuccess('')
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('La password deve avere almeno 8 caratteri.'); return }
    if (password !== confirmPassword) { setError('Le password non coincidono.'); return }
    setBusy(true)
    const { error: err } = await onUpdatePassword(password)
    setBusy(false)
    if (err) { setError(err.message); return }
    setSuccess('Password aggiornata.')
    setPassword('')
    setConfirmPassword('')
  }

  async function handleUsernameSubmit(e) {
    e.preventDefault()
    setError('')
    if (!username.trim()) { setError('Lo username non può essere vuoto.'); return }
    setBusy(true)
    const { error: err } = await onUpdateUsername(username.trim())
    setBusy(false)
    if (err) { setError(err.message); return }
    setSuccess('Profilo aggiornato.')
  }

  async function handleAdminAuthSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error: err } = await onReauthenticate(adminPassword)
    setBusy(false)
    if (err) { setError('Password errata.'); return }
    close()
    onOpenAdmin()
  }

  async function handleDeleteAllData() {
    setError('')
    setBusy(true)
    try {
      await onDeleteAllData()
      setSuccess('Tutti i dati sono stati eliminati.')
      setDeleteConfirmText('')
    } catch (err) {
      setError(err.message || 'Eliminazione fallita, riprova.')
    }
    setBusy(false)
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button type="button" className={styles.gearBtn} onClick={toggle} title="Impostazioni" aria-label="Impostazioni">
        <svg {...gearIcon}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown}>
          {view === 'menu' && (
            <>
              <div className={styles.userLine}>{profile?.username || 'Il tuo account'}</div>
              <button type="button" className={styles.menuItem} onClick={() => goTo('password')}>
                Cambia password
              </button>
              <button type="button" className={styles.menuItem} onClick={() => goTo('profile')}>
                Modifica profilo
              </button>
              <button type="button" className={styles.menuItem} onClick={() => goTo('preferences')}>
                Suoni e animazioni
              </button>
              {isAdmin && (
                <button type="button" className={styles.menuItem} onClick={() => goTo('adminAuth')}>
                  Gestione Account
                </button>
              )}
              <button type="button" className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => goTo('deleteData')}>
                Elimina tutti i dati
              </button>
              <button type="button" className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={onSignOut}>
                Logout
              </button>
            </>
          )}

          {view === 'preferences' && (
            <div className={styles.form}>
              <label className={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={!sfxMuted}
                  onChange={(e) => onToggleSfx(!e.target.checked)}
                />
                Suoni dell'interfaccia
              </label>
              <label className={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={!motionDisabled}
                  onChange={(e) => onToggleMotion(!e.target.checked)}
                />
                Animazioni ed effetti visivi
              </label>
              <div className={styles.formActions}>
                <button type="button" className={styles.backBtn} onClick={() => goTo('menu')}>← Indietro</button>
              </div>
            </div>
          )}

          {view === 'password' && (
            <form className={styles.form} onSubmit={handlePasswordSubmit}>
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {error && <p className={styles.error}>{error}</p>}
              {success && <p className={styles.success}>{success}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.backBtn} onClick={() => goTo('menu')}>← Indietro</button>
                <button type="submit" className={styles.saveBtn} disabled={busy}>{busy ? '...' : 'Salva'}</button>
              </div>
            </form>
          )}

          {view === 'profile' && (
            <form className={styles.form} onSubmit={handleUsernameSubmit}>
              <label className={styles.label}>Username</label>
              <input
                className={styles.input}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              {error && <p className={styles.error}>{error}</p>}
              {success && <p className={styles.success}>{success}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.backBtn} onClick={() => goTo('menu')}>← Indietro</button>
                <button type="submit" className={styles.saveBtn} disabled={busy}>{busy ? '...' : 'Salva'}</button>
              </div>
            </form>
          )}

          {view === 'adminAuth' && (
            <form className={styles.form} onSubmit={handleAdminAuthSubmit}>
              <p className={styles.hint}>Reinserisci la tua password per accedere a Gestione Account.</p>
              <label className={styles.label}>Password</label>
              <input
                className={styles.input}
                type="password"
                autoComplete="current-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                autoFocus
                required
              />
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.backBtn} onClick={() => goTo('menu')}>← Indietro</button>
                <button type="submit" className={styles.saveBtn} disabled={busy}>{busy ? '...' : 'Sblocca'}</button>
              </div>
            </form>
          )}

          {view === 'deleteData' && (
            <div className={styles.form}>
              <p className={styles.hint}>
                Cancella per sempre tutti i tuoi conti, giornate, payout e missioni. Il tuo login resta valido,
                riparti solo con il journal vuoto. Non si può annullare.
              </p>
              {success ? (
                <>
                  <p className={styles.success}>{success}</p>
                  <div className={styles.formActions}>
                    <button type="button" className={styles.saveBtn} onClick={() => goTo('menu')}>Chiudi</button>
                  </div>
                </>
              ) : (
                <>
                  <label className={styles.label}>Scrivi {DELETE_CONFIRM_WORD} per confermare</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    autoFocus
                  />
                  {error && <p className={styles.error}>{error}</p>}
                  <div className={styles.formActions}>
                    <button type="button" className={styles.backBtn} onClick={() => goTo('menu')}>← Indietro</button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      disabled={busy || deleteConfirmText !== DELETE_CONFIRM_WORD}
                      onClick={handleDeleteAllData}
                    >
                      {busy ? '...' : 'Elimina tutto'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
