import { corsHeaders } from '../_shared/cors.ts'
import { requireAdmin, randomPassword, errorStatus } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { admin } = await requireAdmin(req)
    const { userId } = await req.json()
    if (!userId) throw new Error('userId è obbligatorio')

    const tempPassword = randomPassword()
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, { password: tempPassword })
    if (authErr) throw authErr

    const { error: profErr } = await admin.from('profiles').update({ must_change_password: true }).eq('id', userId)
    if (profErr) throw profErr

    return new Response(JSON.stringify({ tempPassword }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: errorStatus(err.message),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
