import { useEffect, useState, useCallback } from 'react'
import { supabase, supabaseConfigured } from './supabaseClient'

// Auth + profilo dell'utente loggato. La sessione stessa è gestita interamente dal client
// Supabase (persistSession/autoRefreshToken in supabaseClient.js) — qui ci limitiamo ad
// ascoltarla e a tenere in sync il profilo (ruolo, stato, must_change_password) da Postgres.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [profileError, setProfileError] = useState(null)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      setProfileError(null)
      return
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Impossibile caricare il profilo:', error.message)
      // Fondamentale: NON lasciare che un profilo non caricato equivalga a "via libera".
      // Se non sappiamo se questo utente deve cambiare password o è disattivato, blocchiamo
      // l'accesso invece di procedere in silenzio con l'app.
      setProfile(null)
      setProfileError(error.message)
      return
    }
    setProfile(data)
    setProfileError(null)
  }, [])

  useEffect(() => {
    let active = true

    if (!supabaseConfigured) {
      setAuthError('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY non configurate. Vedi .env.local.example.')
      setLoading(false)
      return undefined
    }

    // Se VITE_SUPABASE_URL/ANON_KEY non sono configurate (o il progetto non è raggiungibile),
    // getSession() può restare appesa: senza questo timeout la app resterebbe bloccata sulla
    // schermata di caricamento senza spiegazione.
    const timeout = setTimeout(() => {
      if (active) {
        setAuthError('Nessuna risposta da Supabase. Controlla VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY in .env.local.')
        setLoading(false)
      }
    }, 8000)

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!active) return
        clearTimeout(timeout)
        setSession(data.session)
        loadProfile(data.session?.user?.id).finally(() => setLoading(false))
      })
      .catch((err) => {
        if (!active) return
        clearTimeout(timeout)
        setAuthError(err.message)
        setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      loadProfile(newSession?.user?.id)
    })

    return () => {
      active = false
      clearTimeout(timeout)
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function resetPasswordForEmail(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    return { error }
  }

  // Usata sia per il primo cambio password obbligatorio sia da Impostazioni.
  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (!error && profile) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', profile.id)
      setProfile((prev) => (prev ? { ...prev, must_change_password: false } : prev))
    }
    return { error }
  }

  // Ri-verifica la password dell'utente loggato senza toccare la sessione esistente: usata come
  // gate prima di mostrare il pannello Admin, così l'accesso alla gestione account richiede di
  // reinserire le credenziali ogni volta, non solo di essere già loggati.
  async function reauthenticate(password) {
    const email = session?.user?.email
    if (!email) return { error: new Error('Sessione non valida') }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function updateUsername(username) {
    if (!profile) return { error: new Error('Nessun profilo caricato') }
    const { error } = await supabase.from('profiles').update({ username }).eq('id', profile.id)
    if (!error) setProfile((prev) => (prev ? { ...prev, username } : prev))
    return { error }
  }

  return {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    authError,
    profileError,
    isAdmin: profile?.role === 'admin',
    signIn,
    signOut,
    resetPasswordForEmail,
    updatePassword,
    updateUsername,
    reauthenticate,
  }
}
