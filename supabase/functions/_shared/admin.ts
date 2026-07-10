import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

export function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Verifica che chi ha chiamato la function sia autenticato E abbia role='admin' in profiles.
// È l'unica cosa che impedisce a un utente normale di invocare queste API privilegiate: il
// client li chiama con la sua sessione, ma la service_role key non lascia mai il server.
export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('unauthorized')

  const admin = serviceClient()
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) throw new Error('unauthorized')

  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()
  if (profErr || profile?.role !== 'admin') throw new Error('forbidden')

  return { admin, callerId: userData.user.id }
}

export function randomPassword() {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16)
}

export function errorStatus(message: string) {
  if (message === 'unauthorized') return 401
  if (message === 'forbidden') return 403
  return 400
}
