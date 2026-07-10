import { useEffect, useState } from 'react'
import Card from './Card'
import { supabase } from '../supabaseClient'
import styles from './AdminPanel.module.css'

async function extractFunctionError(error) {
  if (!error) return null
  try {
    const body = await error.context.json()
    if (body?.error) return body.error
  } catch {
    // risposta non-JSON o già consumata: usiamo il messaggio generico sotto
  }
  return error.message || 'Errore imprevisto'
}

function fmtDate(iso) {
  if (!iso) return 'mai'
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [newEmail, setNewEmail] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [revealedPassword, setRevealedPassword] = useState(null) // { username, password }
  const [busyUserId, setBusyUserId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [rowError, setRowError] = useState('')

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_list_users')
    if (error) setListError(error.message)
    else { setUsers(data || []); setListError('') }
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { email: newEmail.trim(), username: newUsername.trim() },
    })
    setCreating(false)
    if (error) {
      setCreateError(await extractFunctionError(error))
      return
    }
    setRevealedPassword({ username: newUsername.trim(), password: data.tempPassword })
    setNewEmail('')
    setNewUsername('')
    loadUsers()
  }

  async function handleToggleStatus(user) {
    setRowError('')
    setBusyUserId(user.id)
    const nextStatus = user.status === 'active' ? 'disabled' : 'active'
    const { error } = await supabase.functions.invoke('admin-set-status', {
      body: { userId: user.id, status: nextStatus },
    })
    setBusyUserId(null)
    if (error) { setRowError(await extractFunctionError(error)); return }
    loadUsers()
  }

  async function handleResetPassword(user) {
    setRowError('')
    setBusyUserId(user.id)
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { userId: user.id },
    })
    setBusyUserId(null)
    if (error) { setRowError(await extractFunctionError(error)); return }
    setRevealedPassword({ username: user.username, password: data.tempPassword })
    loadUsers()
  }

  async function handleDelete(user) {
    setRowError('')
    setBusyUserId(user.id)
    const { error } = await supabase.functions.invoke('admin-delete-user', {
      body: { userId: user.id },
    })
    setBusyUserId(null)
    setConfirmDeleteId(null)
    if (error) { setRowError(await extractFunctionError(error)); return }
    loadUsers()
  }

  return (
    <div className={styles.wrap}>
      <Card>
        <div className={styles.title}>Crea nuovo utente</div>
        <form className={styles.form} onSubmit={handleCreate}>
          <label className={styles.field}>
            <span>Email</span>
            <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Username</span>
            <input type="text" required value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
          </label>
          <button type="submit" className={styles.submit} disabled={creating}>
            {creating ? '...' : 'Crea utente'}
          </button>
        </form>
        {createError && <p className={styles.error}>{createError}</p>}

        {revealedPassword && (
          <div className={styles.revealBox}>
            <div className={styles.revealText}>
              Password temporanea per <strong>{revealedPassword.username}</strong> (mostrata una sola volta, condividila tu con la persona):
            </div>
            <code className={styles.revealPassword}>{revealedPassword.password}</code>
            <button type="button" className={styles.linkBtn} onClick={() => setRevealedPassword(null)}>Chiudi</button>
          </div>
        )}
      </Card>

      <Card>
        <div className={styles.title}>Utenti ({users.length})</div>
        {rowError && <p className={styles.error}>{rowError}</p>}
        {listError && <p className={styles.error}>{listError}</p>}
        {loading ? (
          <p className={styles.empty}>Caricamento…</p>
        ) : users.length === 0 ? (
          <p className={styles.empty}>Nessun utente.</p>
        ) : (
          <div className={styles.list}>
            {users.map((u) => (
              <div key={u.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <span className={styles.username}>{u.username || '—'}</span>
                  <span className={styles.email}>{u.email}</span>
                  <span className={`${styles.badge} ${u.role === 'admin' ? styles.badgeAdmin : styles.badgeUser}`}>{u.role}</span>
                  <span className={`${styles.badge} ${u.status === 'active' ? styles.badgeActive : styles.badgeDisabled}`}>
                    {u.status === 'active' ? 'attivo' : 'disattivato'}
                  </span>
                </div>
                <div className={styles.rowMeta}>Ultimo accesso: {fmtDate(u.last_sign_in_at)}</div>
                <div className={styles.rowActions}>
                  <button
                    className={styles.actionBtn}
                    disabled={busyUserId === u.id}
                    onClick={() => handleToggleStatus(u)}
                  >
                    {u.status === 'active' ? 'Disattiva' : 'Attiva'}
                  </button>
                  <button
                    className={styles.actionBtn}
                    disabled={busyUserId === u.id}
                    onClick={() => handleResetPassword(u)}
                  >
                    Reset password
                  </button>
                  {confirmDeleteId === u.id ? (
                    <>
                      <button className={styles.actionBtn} onClick={() => setConfirmDeleteId(null)}>Annulla</button>
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        disabled={busyUserId === u.id}
                        onClick={() => handleDelete(u)}
                      >
                        Conferma eliminazione
                      </button>
                    </>
                  ) : (
                    <button
                      className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                      onClick={() => setConfirmDeleteId(u.id)}
                    >
                      Elimina
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
