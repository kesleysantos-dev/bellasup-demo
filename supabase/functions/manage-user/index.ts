import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify caller is super_admin
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: roleData } = await adminClient.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'super_admin').maybeSingle()
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'list_users') {
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      if (listError) {
        return new Response(JSON.stringify({ error: listError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const emailMap: Record<string, string> = {}
      users.forEach((u: any) => { emailMap[u.id] = u.email || '' })
      return new Response(JSON.stringify({ emails: emailMap }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'create_user') {
      const { email, password, nome } = body
      const slug = nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome, slug },
      })
      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'delete_user') {
      const { user_id, profile_id } = body
      // Delete profile (cascade will clean services, hours, appointments)
      await adminClient.from('profiles').delete().eq('id', profile_id)
      // Delete auth user
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id)
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'reset_password') {
      const { user_id, new_password } = body
      const { error } = await adminClient.auth.admin.updateUserById(user_id, { password: new_password })
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
