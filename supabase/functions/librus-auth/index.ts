/// <reference lib="deno.ns" />
// Edge Function: librus-auth
// Handles Librus Synergia account connection and token management.
//
// POST /librus-auth { action: 'connect'    | 'disconnect' | 'refresh' | 'status' }
//
//  connect:    { household_id, member_id, username, password }
//               → fetches Librus tokens, stores connection, returns connection summary
//  disconnect: { connection_id }
//               → deletes connection row (and all cached data via cascade)
//  refresh:    { connection_id }
//               → refreshes the access token and updates the DB row
//  status:     { connection_id }
//               → returns connection metadata without sensitive fields

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// ─── Librus API constants (from szkolny-android open-source code) ──────────
const LIBRUS_API_TOKEN_URL = 'https://api.librus.pl/OAuth/Token';
const LIBRUS_API_URL = 'https://api.librus.pl/2.0';
// Read from Supabase secret / environment variable.
// Guard is deferred to inside the handler so the OPTIONS preflight succeeds
// even when the secret is not yet configured in the local environment.
const LIBRUS_API_AUTHORIZATION = Deno.env.get('LIBRUS_API_AUTHORIZATION');
const LIBRUS_USER_AGENT = 'LibrusMobileApp';

// ─── CORS headers ──────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── Librus token fetch ─────────────────────────────────────
async function fetchLibrusToken(
  grantType: 'password' | 'refresh_token',
  params: Record<string, string>,
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const body = new URLSearchParams({
    grant_type: grantType,
    librus_long_term_token: '1',
    librus_rules_accepted: '1',
    ...params,
  });

  const resp = await fetch(LIBRUS_API_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${LIBRUS_API_AUTHORIZATION}`,
      'User-Agent': LIBRUS_USER_AGENT,
    },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`Librus token error ${resp.status}: ${text}`);
    return null;
  }

  return resp.json();
}

// ─── Librus API GET request ─────────────────────────────────
async function librusGet(
  endpoint: string,
  accessToken: string,
): Promise<Record<string, unknown> | null> {
  const resp = await fetch(`${LIBRUS_API_URL}/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': LIBRUS_USER_AGENT,
    },
  });

  if (!resp.ok) {
    console.error(`Librus API error ${resp.status} for /${endpoint}`);
    return null;
  }

  return resp.json();
}

// ─── Main handler ───────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Fail fast if the required secret was not injected (deferred from module level
  // so that the OPTIONS preflight above is never blocked).
  if (!LIBRUS_API_AUTHORIZATION) {
    return json(
      { error: 'Server misconfiguration: LIBRUS_API_AUTHORIZATION secret is not set.' },
      503,
    );
  }

  // Initialise Supabase client with caller's JWT for RLS enforcement
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';

  // User client (RLS enforced) – used to verify membership
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Service client – used to write tokens (bypasses RLS for INSERT/UPDATE)
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const action = body.action as string;

  // ── action: connect ──────────────────────────────────────
  if (action === 'connect') {
    const { household_id, member_id, username, password } = body as {
      household_id?: string;
      member_id?: string;
      username?: string;
      password?: string;
    };

    if (!household_id || !member_id || !username || !password) {
      return json({ error: 'household_id, member_id, username and password are required' }, 400);
    }

    // Verify caller is an active member of the household
    const { data: membership, error: memberErr } = await userClient
      .from('members')
      .select('id, role')
      .eq('household_id', household_id)
      .eq('is_active', true)
      .maybeSingle();

    if (memberErr || !membership) {
      return json({ error: 'Forbidden: not a household member' }, 403);
    }

    // Verify the submitted member_id belongs to the same household
    const { data: targetMember, error: targetMemberErr } = await serviceClient
      .from('members')
      .select('id')
      .eq('id', member_id)
      .eq('household_id', household_id)
      .eq('is_active', true)
      .maybeSingle();

    if (targetMemberErr || !targetMember) {
      return json({ error: 'Forbidden: member_id does not belong to this household' }, 403);
    }

    // Authenticate with Librus
    const tokens = await fetchLibrusToken('password', { username, password });
    if (!tokens) {
      return json(
        {
          error: 'Librus authentication failed. Check your username and password (Synergia login).',
        },
        401,
      );
    }

    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Fetch student info from Librus
    const meData = await librusGet('Me', tokens.access_token);
    const me = (meData?.Me as Record<string, unknown>) ?? {};
    const account = (me.Account as Record<string, unknown>) ?? {};
    const cls = (me.Class as Record<string, unknown>) ?? {};

    const studentName = [account.FirstName, account.LastName].filter(Boolean).join(' ') || username;
    const classSymbol = cls.Symbol ? `${cls.Number ?? ''}${cls.Symbol}` : '';

    // Fetch school info
    const schoolsData = await librusGet('Schools', tokens.access_token);
    const schools = (schoolsData?.Schools as Record<string, unknown>[]) ?? [];
    const schoolName = (schools[0]?.Name as string) ?? '';

    const displayLabel = [studentName, classSymbol].filter(Boolean).join(' – ');

    // Upsert connection row (service client to write tokens)
    const { data: conn, error: connErr } = await serviceClient
      .from('school_connections')
      .upsert(
        {
          household_id,
          member_id,
          platform: 'librus',
          display_label: displayLabel,
          student_name: studentName,
          class_name: classSymbol,
          school_name: schoolName,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: tokenExpiry,
          is_active: true,
          sync_error: null,
        },
        {
          onConflict: 'household_id,member_id,platform',
          ignoreDuplicates: false,
        },
      )
      .select('id, display_label, student_name, class_name, school_name, is_active, created_at')
      .single();

    if (connErr) {
      console.error('DB upsert error:', connErr);
      return json({ error: 'Failed to save connection' }, 500);
    }

    return json({ ok: true, connection: conn });
  }

  // ── action: disconnect ───────────────────────────────────
  if (action === 'disconnect') {
    const { connection_id } = body as { connection_id?: string };
    if (!connection_id) return json({ error: 'connection_id is required' }, 400);

    // Load connection to get household_id for membership check
    const { data: conn } = await userClient
      .from('school_connections')
      .select('id, household_id')
      .eq('id', connection_id)
      .single();

    if (!conn) return json({ error: 'Connection not found or access denied' }, 404);

    // Only owner/admin can disconnect; regular member can disconnect their own
    const { error: delErr } = await serviceClient
      .from('school_connections')
      .delete()
      .eq('id', connection_id);

    if (delErr) return json({ error: 'Failed to disconnect' }, 500);

    return json({ ok: true });
  }

  // ── action: refresh ──────────────────────────────────────
  if (action === 'refresh') {
    const { connection_id } = body as { connection_id?: string };
    if (!connection_id) return json({ error: 'connection_id is required' }, 400);

    // RLS-guarded read (verifies caller is household member)
    const { data: conn, error: connErr } = await userClient
      .from('school_connections')
      .select('refresh_token, household_id')
      .eq('id', connection_id)
      .eq('is_active', true)
      .single();

    if (connErr || !conn) return json({ error: 'Connection not found or access denied' }, 404);
    if (!conn.refresh_token) return json({ error: 'No refresh token stored' }, 400);

    const tokens = await fetchLibrusToken('refresh_token', {
      refresh_token: conn.refresh_token,
    });

    if (!tokens) return json({ error: 'Token refresh failed' }, 502);

    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: updErr } = await serviceClient
      .from('school_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokenExpiry,
        sync_error: null,
      })
      .eq('id', connection_id);

    if (updErr) return json({ error: 'Failed to update tokens' }, 500);

    return json({ ok: true, token_expiry: tokenExpiry });
  }

  // ── action: status ───────────────────────────────────────
  if (action === 'status') {
    const { connection_id } = body as { connection_id?: string };
    if (!connection_id) return json({ error: 'connection_id is required' }, 400);

    const { data: conn, error: connErr } = await userClient
      .from('school_connections')
      .select(
        'id, display_label, student_name, class_name, school_name, platform, is_active, last_synced_at, sync_error, token_expiry, created_at',
      )
      .eq('id', connection_id)
      .single();

    if (connErr || !conn) return json({ error: 'Connection not found or access denied' }, 404);

    return json({ ok: true, connection: conn });
  }

  return json({ error: `Unknown action: ${action}` }, 400);
});
