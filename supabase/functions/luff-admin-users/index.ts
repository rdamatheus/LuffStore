import { createClient } from 'npm:@supabase/supabase-js@2.115.0';

const allowedOrigins = new Set([
  'https://rdamatheus.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

function cors(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://rdamatheus.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' }
  });
}

function getKeys() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableRaw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  const secretRaw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!supabaseUrl || !publishableRaw || !secretRaw) throw new Error('Supabase environment unavailable');
  const publishableKey = JSON.parse(publishableRaw)?.default;
  const secretKey = JSON.parse(secretRaw)?.default;
  if (!publishableKey || !secretKey) throw new Error('Supabase API keys unavailable');
  return { supabaseUrl, publishableKey, secretKey };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json(req, { error: 'Authentication required' }, 401);

    const { supabaseUrl, publishableKey, secretKey } = getKeys();
    const token = authHeader.slice('Bearer '.length);
    const userClient = createClient(supabaseUrl, publishableKey, {
      db: { schema: 'luff' },
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json(req, { error: 'Invalid or expired session' }, 401);

    const admin = createClient(supabaseUrl, secretKey, {
      db: { schema: 'luff' },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: tenant, error: tenantError } = await admin.from('tenants').select('id').eq('slug', 'luff-store').single();
    if (tenantError || !tenant) return json(req, { error: 'LUFF tenant unavailable' }, 500);

    const { data: caller, error: callerError } = await admin.from('members')
      .select('user_id,role,status')
      .eq('tenant_id', tenant.id)
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (callerError) return json(req, { error: 'Authorization check failed' }, 500);
    if (!caller || caller.role !== 'owner' || caller.status !== 'active') return json(req, { error: 'Owner access required' }, 403);

    const payload = await req.json().catch(() => ({}));
    const action = String(payload?.action ?? 'list');

    if (action === 'list') {
      const { data: members, error } = await admin.from('members')
        .select('user_id,role,status,display_name,email,created_at,updated_at')
        .eq('tenant_id', tenant.id)
        .order('created_at');
      if (error) throw error;
      const normalized = [];
      for (const member of members ?? []) {
        const { data: authData } = await admin.auth.admin.getUserById(member.user_id);
        normalized.push({
          ...member,
          email: member.email || authData?.user?.email || null,
          display_name: member.display_name || authData?.user?.user_metadata?.display_name || authData?.user?.email?.split('@')[0] || 'Usuário',
          last_sign_in_at: authData?.user?.last_sign_in_at || null,
          email_confirmed_at: authData?.user?.email_confirmed_at || null,
          provider: authData?.user?.app_metadata?.provider || null
        });
      }
      return json(req, { users: normalized });
    }

    if (action === 'create') {
      const email = String(payload?.email ?? '').trim().toLowerCase();
      const password = String(payload?.password ?? '');
      const displayName = String(payload?.display_name ?? '').trim();
      const role = ['owner','manager','staff'].includes(payload?.role) ? payload.role : 'staff';
      if (!email || !email.includes('@')) return json(req, { error: 'E-mail inválido' }, 400);
      if (password.length < 10) return json(req, { error: 'A senha deve ter pelo menos 10 caracteres' }, 400);

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName || email.split('@')[0], luff_internal: true }
      });
      if (createError || !created.user) return json(req, { error: createError?.message || 'Não foi possível criar usuário' }, 400);

      const { error: memberError } = await admin.from('members').insert({
        tenant_id: tenant.id,
        user_id: created.user.id,
        role,
        status: 'active',
        display_name: displayName || email.split('@')[0],
        email
      });
      if (memberError) {
        await admin.auth.admin.deleteUser(created.user.id);
        throw memberError;
      }
      return json(req, { user: { id: created.user.id, email, display_name: displayName || email.split('@')[0], role, status: 'active' } }, 201);
    }

    if (action === 'update_member') {
      const userId = String(payload?.user_id ?? '');
      const role = ['owner','manager','staff'].includes(payload?.role) ? payload.role : null;
      const status = ['active','suspended'].includes(payload?.status) ? payload.status : null;
      const displayName = typeof payload?.display_name === 'string' ? payload.display_name.trim() : undefined;
      if (!userId || !role || !status) return json(req, { error: 'Dados de usuário incompletos' }, 400);
      if (userId === userData.user.id && (role !== 'owner' || status !== 'active')) {
        return json(req, { error: 'O owner atual não pode remover o próprio acesso' }, 400);
      }
      const update: Record<string, unknown> = { role, status };
      if (displayName !== undefined) update.display_name = displayName;
      const { data, error } = await admin.from('members')
        .update(update)
        .eq('tenant_id', tenant.id)
        .eq('user_id', userId)
        .select('user_id,role,status,display_name,email')
        .single();
      if (error) throw error;
      return json(req, { user: data });
    }

    if (action === 'set_password') {
      const userId = String(payload?.user_id ?? '');
      const password = String(payload?.password ?? '');
      if (password.length < 10) return json(req, { error: 'A senha deve ter pelo menos 10 caracteres' }, 400);
      const { data: target, error: targetError } = await admin.from('members')
        .select('user_id')
        .eq('tenant_id', tenant.id)
        .eq('user_id', userId)
        .maybeSingle();
      if (targetError || !target) return json(req, { error: 'Usuário não pertence à LUFF' }, 404);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) throw error;
      return json(req, { success: true });
    }

    return json(req, { error: 'Ação não suportada' }, 400);
  } catch (error) {
    console.error('luff-admin-users failed', error);
    return json(req, { error: error instanceof Error ? error.message : 'Unexpected server error' }, 500);
  }
});
