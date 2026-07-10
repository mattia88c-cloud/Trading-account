import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

if (!supabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    'Mancano VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia .env.local.example in .env.local ' +
    'e inserisci i valori del tuo progetto Supabase (Project Settings -> API).'
  )
}

// createClient lancia subito un'eccezione se url/anonKey mancano, il che farebbe fallire il
// mount di React prima ancora che possiamo mostrare un messaggio d'errore leggibile. Con un
// placeholder valido come URL il client si crea comunque; le chiamate falliranno più avanti
// (gestito da useAuth con un timeout/errore visibile) invece di far crashare tutto subito.
export const supabase = createClient(
  supabaseConfigured ? url : 'https://placeholder.supabase.co',
  supabaseConfigured ? anonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)
