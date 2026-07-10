import { corsHeaders } from '../_shared/cors.ts'
import { requireAdmin, errorStatus } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { admin, callerId } = await requireAdmin(req)
    const { userId } = await req.json()
    if (!userId) throw new Error('userId è obbligatorio')
    if (userId === callerId) throw new Error('Non puoi eliminare il tuo stesso account')

    const { error } = await admin.auth.admin.deleteUser(userId)
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
