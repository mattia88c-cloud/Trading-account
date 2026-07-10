import { corsHeaders } from '../_shared/cors.ts'
import { requireAdmin, randomPassword, errorStatus } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { admin } = await requireAdmin(req)
    const { email, username } = await req.json()
    if (!email || !username) throw new Error('email e username sono obbligatori')

    const tempPassword = randomPassword()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { username },
    })
    if (error) throw error

    return new Response(JSON.stringify({ userId: data.user.id, tempPassword }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: errorStatus(err.message),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
