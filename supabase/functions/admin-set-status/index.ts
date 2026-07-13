import { corsHeaders } from '../_shared/cors.ts'
import { requireAdmin, errorStatus } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { admin, callerId } = await requireAdmin(req)
    const { userId, status: nextStatus } = await req.json()
    if (!userId || !['active', 'disabled'].includes(nextStatus)) {
      throw new Error('userId e status (active|disabled) sono obbligatori')
    }
    if (userId === callerId) throw new Error('Non puoi disattivare il tuo stesso account')

    // Riattivando un account azzeriamo last_login_at: altrimenti lo standby automatico per
    // inattività (30gg, vedi useAuth.js) lo ridisattiverebbe al primissimo accesso successivo,
    // dato che l'ultimo login registrato resterebbe quello vecchio da prima della disattivazione.
    const patch = { status: nextStatus }
    if (nextStatus === 'active') patch.last_login_at = null

    const { error } = await admin.from('profiles').update(patch).eq('id', userId)
    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: errorStatus(err.message),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
