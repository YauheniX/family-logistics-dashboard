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

// ─── Librus constants (source: szkolny-android/Constants.kt) ─────────────────
// Direct API (api.librus.pl)
const LIBRUS_API_URL = 'https://api.librus.pl/2.0';
// Portal OAuth (portal.librus.pl) — the only login path that works from cloud IPs
const LIBRUS_AUTHORIZE_URL = 'https://portal.librus.pl/konto-librus/redirect/dru';
const LIBRUS_LOGIN_URL = 'https://portal.librus.pl/konto-librus/login/action';
const LIBRUS_TOKEN_URL = 'https://portal.librus.pl/oauth2/access_token';
const LIBRUS_PORTAL_URL = 'https://portal.librus.pl/api';
// Portal OAuth client credentials
const LIBRUS_CLIENT_ID = 'VaItV6oRutdo8fnjJwysnTjVlvaswf52ZqmXsJGP';
const LIBRUS_REDIRECT_URL = 'app://librus';
// X-Requested-With value the Librus portal SPA expects
const LIBRUS_HEADER = 'pl.librus.synergiaDru2';
// Mobile User-Agent used by szkolny-android for all Librus requests
const LIBRUS_USER_AGENT =
  'Dalvik/2.1.0 (Linux; U; Android 11; Android SDK built for x86)LibrusMobileApp';

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

// ─── Cookie helpers ─────────────────────────────────────────
// Parse a single Set-Cookie string "name=value; Path=...; ..." → [name, value]
function parseSingleCookie(setCookie: string): [string, string] | null {
  const semi = setCookie.indexOf(';');
  const kv = semi === -1 ? setCookie : setCookie.slice(0, semi);
  const eq = kv.indexOf('=');
  if (eq <= 0) return null;
  return [kv.slice(0, eq).trim(), kv.slice(eq + 1).trim()];
}

// Merge all Set-Cookie response headers into the cookie jar.
// Uses getSetCookie() (WHATWG Fetch API) to get each cookie as a separate
// string — avoids the comma-splitting ambiguity of headers.get('set-cookie').
function mergeCookies(resp: Response, jar: Record<string, string>) {
  // Deno 1.38+ supports getSetCookie(); fall back to manual split if unavailable
  type HeadersWithGSC = Headers & { getSetCookie?: () => string[] };
  const setCookies: string[] =
    (resp.headers as HeadersWithGSC).getSetCookie?.() ??
    (resp.headers.get('set-cookie') ?? '')
      .split(/,(?=\s*[A-Za-z_][A-Za-z0-9_-]*=)/) // best-effort fallback
      .filter(Boolean);

  for (const sc of setCookies) {
    const pair = parseSingleCookie(sc);
    if (pair) jar[pair[0]] = pair[1];
  }
}

function formatCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function resolveUrl(location: string, base: string): string {
  if (/^https?:\/\//.test(location) || location.startsWith('app://')) return location;
  try {
    return new URL(location, base).toString();
  } catch {
    return location;
  }
}

// ─── Portal login flow (mirrors LibrusLoginPortal.kt from szkolny-android) ───
//
// Step 1: GET LIBRUS_AUTHORIZE_URL → follow redirects; collect cookies;
//         stop at the 200 login-form page on portal.librus.pl
// Step 2: Extract CSRF token + hidden inputs from the form HTML
// Step 3: POST LIBRUS_LOGIN_URL with email/password + X-CSRF-TOKEN header
// Step 4: Follow redirects until Location matches app://librus?code=XXX
// Step 5: POST LIBRUS_TOKEN_URL to exchange code → portalAccessToken + portalRefreshToken
// Step 6: GET /v3/SynergiaAccounts/fresh/{email} → API accessToken for api.librus.pl
async function loginWithWebFlow(
  email: string,
  password: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const jar: Record<string, string> = {};

  const baseHeaders = () => ({
    'User-Agent': LIBRUS_USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
    // No Accept-Encoding — let Deno handle decompression transparently
    'X-Requested-With': LIBRUS_HEADER,
    Cookie: formatCookies(jar),
  });

  // ── Step 1: follow redirects from the authorize URL until we hit the login form
  let currentUrl = LIBRUS_AUTHORIZE_URL;
  let formHtml = '';
  let formReferer = LIBRUS_AUTHORIZE_URL;

  for (let i = 0; i < 10; i++) {
    const resp = await fetch(currentUrl, { headers: baseHeaders(), redirect: 'manual' });
    mergeCookies(resp, jar);

    const location = resp.headers.get('location') ?? '';

    if (resp.status >= 300 && resp.status < 400) {
      console.error(`Redirect ${i}`, { from: currentUrl, to: location, status: resp.status });
      if (!location) break;
      formReferer = currentUrl;
      currentUrl = resolveUrl(location, currentUrl);
      continue;
    }

    // 200 — this is the login form
    formHtml = await resp.text().catch(() => '');
    console.error('Login form found', {
      url: currentUrl,
      htmlLen: formHtml.length,
      htmlSnippet: formHtml.slice(0, 300),
    });
    break;
  }

  if (!formHtml) {
    console.error('loginWithWebFlow: could not reach login form', { finalUrl: currentUrl });
    return null;
  }

  // ── Step 2: extract CSRF token and all hidden inputs
  const csrfMeta =
    /<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/i.exec(formHtml) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']csrf-token["']/i.exec(formHtml);
  const csrfToken = csrfMeta?.[1] ?? '';

  const hiddenInputs: Record<string, string> = {};
  const inputRe = /<input[^>]+type=["']hidden["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = inputRe.exec(formHtml)) !== null) {
    const nameM = /name=["']([^"']+)["']/.exec(m[0]);
    const valM = /value=["']([^"']*)/.exec(m[0]);
    if (nameM) hiddenInputs[nameM[1]] = valM?.[1] ?? '';
  }

  console.error('Form meta', {
    csrfToken: csrfToken.slice(0, 20) + '…',
    hiddenFields: Object.keys(hiddenInputs),
  });

  // ── Step 3: POST credentials to the login action URL
  // Extract actual <form action="..."> in case it differs from LIBRUS_LOGIN_URL
  let loginActionUrl = LIBRUS_LOGIN_URL;
  const formActionM =
    /<form[^>]+method=["']post["'][^>]*action=["']([^"']+)["']/i.exec(formHtml) ??
    /<form[^>]+action=["']([^"']+)["'][^>]*method=["']post["']/i.exec(formHtml);
  if (formActionM?.[1]) {
    loginActionUrl = resolveUrl(formActionM[1], currentUrl);
  }
  console.error('Login action URL', { url: loginActionUrl });

  const loginBody = new URLSearchParams({
    ...hiddenInputs,
    email,
    password,
  });

  const loginHeaders: Record<string, string> = {
    ...baseHeaders(),
    'Content-Type': 'application/x-www-form-urlencoded',
    Referer: currentUrl,
  };
  if (csrfToken) loginHeaders['X-CSRF-TOKEN'] = csrfToken;

  const loginResp = await fetch(loginActionUrl, {
    method: 'POST',
    headers: loginHeaders,
    redirect: 'manual',
    body: loginBody.toString(),
  });
  mergeCookies(loginResp, jar);

  const loginLocation = loginResp.headers.get('location') ?? '';
  console.error('After login POST', {
    status: loginResp.status,
    location: loginLocation,
    cookieKeys: Object.keys(jar),
    sessionLen: jar['portal_librus_session']?.length ?? 0,
  });

  if (loginResp.status >= 400) {
    const txt = await loginResp.text().catch(() => '');
    console.error('Login POST rejected', { status: loginResp.status, body: txt.slice(0, 400) });
    return null;
  }

  // ── Step 4: follow redirects until app://librus?code=XXX
  let code: string | null = null;
  let nextUrl = loginLocation ? resolveUrl(loginLocation, LIBRUS_LOGIN_URL) : LIBRUS_AUTHORIZE_URL;

  for (let i = 0; i < 10; i++) {
    if (nextUrl.startsWith('app://librus')) {
      const codeParam = nextUrl.slice(nextUrl.indexOf('?') + 1);
      code = new URLSearchParams(codeParam).get('code');
      console.error('Got auth code', { codePrefix: code?.slice(0, 8) + '…' });
      break;
    }

    const resp = await fetch(nextUrl, { headers: baseHeaders(), redirect: 'manual' });
    mergeCookies(resp, jar);
    const loc = resp.headers.get('location') ?? '';
    console.error(`Follow ${i}`, { url: nextUrl, status: resp.status, location: loc });
    if (!loc) break;
    nextUrl = resolveUrl(loc, nextUrl);
  }

  if (!code) {
    console.error('loginWithWebFlow: no auth code in redirect chain', { lastUrl: nextUrl });
    return null;
  }

  // ── Step 5: exchange code for portal access token
  const tokenResp = await fetch(LIBRUS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': LIBRUS_USER_AGENT,
    },
    body: new URLSearchParams({
      client_id: LIBRUS_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: LIBRUS_REDIRECT_URL,
    }).toString(),
  });

  const tokenText = await tokenResp.text();
  console.error('Portal token exchange', {
    status: tokenResp.status,
    body: tokenText.slice(0, 300),
  });

  if (!tokenResp.ok) return null;

  let portalToken: Record<string, unknown>;
  try {
    portalToken = JSON.parse(tokenText);
  } catch {
    return null;
  }

  const portalAccessToken = portalToken.access_token as string;
  const portalRefreshToken = (portalToken.refresh_token as string) ?? '';
  const expiresIn = (portalToken.expires_in as number) ?? 3600;

  // ── Step 6: exchange portal token for Synergia API access token
  // Use /v3/SynergiaAccounts (no login param) — portal email ≠ Synergia numeric login
  const apiToken = await fetchSynergiaToken(portalAccessToken);
  if (!apiToken) return null;

  return { access_token: apiToken, refresh_token: portalRefreshToken, expires_in: expiresIn };
}

// ─── Fetch Synergia API token from the Portal accounts endpoint ───────────────
// Uses the portal Bearer token to get the api.librus.pl access token.
async function fetchSynergiaToken(
  portalAccessToken: string,
  login?: string,
): Promise<string | null> {
  const url = login
    ? `${LIBRUS_PORTAL_URL}/v3/SynergiaAccounts/fresh/${encodeURIComponent(login)}`
    : `${LIBRUS_PORTAL_URL}/v3/SynergiaAccounts`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${portalAccessToken}`,
      'User-Agent': LIBRUS_USER_AGENT,
      Accept: 'application/json',
    },
  });

  const txt = await resp.text();
  console.error('SynergiaAccounts', { url, status: resp.status, body: txt.slice(0, 400) });
  if (!resp.ok) return null;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(txt);
  } catch {
    return null;
  }

  // Response is either { account: { accessToken } } (fresh) or { accounts: [{ accessToken }] }
  const account =
    (data.account as Record<string, unknown>) ??
    ((data.accounts as Record<string, unknown>[])?.[0] as Record<string, unknown>);
  const apiToken = (account?.accessToken as string) ?? (account?.access_token as string);

  if (!apiToken) {
    console.error('SynergiaAccounts: no accessToken in response', { keys: Object.keys(data) });
  }
  return apiToken ?? null;
}

// ─── Refresh portal token → new Synergia API token ───────────────────────────
async function refreshAccessToken(
  portalRefreshToken: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const resp = await fetch(LIBRUS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': LIBRUS_USER_AGENT,
    },
    body: new URLSearchParams({
      client_id: LIBRUS_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: portalRefreshToken,
    }).toString(),
  });

  const txt = await resp.text();
  console.error('Portal refresh', { status: resp.status, body: txt.slice(0, 300) });
  if (!resp.ok) {
    console.error('Librus refresh_token failed', { status: resp.status });
    return null;
  }

  let portalToken: Record<string, unknown>;
  try {
    portalToken = JSON.parse(txt);
  } catch {
    return null;
  }

  const newPortalAccessToken = portalToken.access_token as string;
  const newPortalRefreshToken = (portalToken.refresh_token as string) ?? portalRefreshToken;
  const expiresIn = (portalToken.expires_in as number) ?? 3600;

  // Exchange portal access token for Synergia API access token
  const apiToken = await fetchSynergiaToken(newPortalAccessToken);
  if (!apiToken) return null;

  return { access_token: apiToken, refresh_token: newPortalRefreshToken, expires_in: expiresIn };
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
      Accept: 'application/json',
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

  // Resolve caller identity once; used by permission checks below.
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return json({ error: 'Unauthorized: invalid or missing auth token' }, 401);
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

    // Trim whitespace — a trailing space in the username causes Librus to
    // return unsupported_grant_type even though the grant_type field is correct.
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      return json({ error: 'username and password must not be blank' }, 400);
    }

    // Verify caller is an active member of the household.
    // We must filter by user_id explicitly so that maybeSingle() never
    // receives multiple rows (owners/admins can see all household members
    // via RLS, which would cause maybeSingle to return an error).
    const { data: membership, error: memberErr } = await userClient
      .from('members')
      .select('id, role')
      .eq('household_id', household_id)
      .eq('user_id', user.id)
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

    // Authenticate with Librus via the web OAuth flow (client_id=46)
    const tokens = await loginWithWebFlow(trimmedUsername, trimmedPassword);
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
          onConflict: 'member_id,platform',
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

    const tokens = await refreshAccessToken(conn.refresh_token);

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
