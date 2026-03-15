/// <reference lib="deno.ns" />
// Edge Function: librus-sync
// Fetches student data from Librus Synergia API and caches it in Supabase tables.
//
// POST /librus-sync { connection_id, since?: ISO date string }

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const LIBRUS_API_URL = 'https://api.librus.pl/2.0';
// Portal OAuth — must match what librus-auth uses for token refresh
const LIBRUS_PORTAL_TOKEN_URL = 'https://portal.librus.pl/oauth2/access_token';
const LIBRUS_PORTAL_API_URL = 'https://portal.librus.pl/api';
const LIBRUS_CLIENT_ID = 'VaItV6oRutdo8fnjJwysnTjVlvaswf52ZqmXsJGP';
// User-Agent must include the Android Dalvik prefix or Librus rejects the request.
const LIBRUS_USER_AGENT =
  'Dalvik/2.1.0 (Linux; U; Android 11; Android SDK built for x86)LibrusMobileApp';

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

// ─── Librus API helpers ─────────────────────────────────────

type LibrusResponse = Record<string, unknown>;

/** Thrown when the API returns 400 with alternative Resource URLs */
class Librus400Error extends Error {
  resources: Record<string, { Url: string }> | null;
  constructor(endpoint: string, resources: Record<string, { Url: string }> | null) {
    super(`Librus GET /${endpoint} 400 InvalidRequest`);
    this.resources = resources;
  }
}
async function librusGet(endpoint: string, accessToken: string): Promise<LibrusResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const resp = await fetch(`${LIBRUS_API_URL}/${endpoint}`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': LIBRUS_USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'pl-PL',
        'Accept-Encoding': 'gzip',
        Connection: 'Keep-Alive',
      },
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      // 403 / 404 → feature not available for this account type → treat as empty (not an error)
      if (resp.status === 403 || resp.status === 404) {
        console.warn(
          `librusGet /${endpoint} → ${resp.status} (feature unavailable): ${body.slice(0, 200)}`,
        );
        return null;
      }
      // 400 → "Invalid request params" — the response body contains a Resources map
      //         of valid alternative endpoint URLs for this account type.
      //         Throw a typed error so callers (e.g. syncTimetable) can fall back.
      let resources: Record<string, { Url: string }> | null = null;
      try {
        resources = (JSON.parse(body) as LibrusResponse).Resources as Record<
          string,
          { Url: string }
        >;
      } catch {
        /* ok */
      }
      console.warn(
        `librusGet /${endpoint} → 400. Available resources: ${resources ? Object.keys(resources).join(', ') : 'none'}`,
      );
      throw new Librus400Error(endpoint, resources);
    }
    return resp.json();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Librus GET /${endpoint} timed out after 10s`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function refreshToken(portalRefreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  // Step 1: refresh the portal OAuth token
  const resp = await fetch(LIBRUS_PORTAL_TOKEN_URL, {
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

  if (!resp.ok) {
    console.error('Portal token refresh failed', { status: resp.status });
    return null;
  }

  let portalToken: Record<string, unknown>;
  try {
    portalToken = await resp.json();
  } catch {
    return null;
  }

  const newPortalAccessToken = portalToken.access_token as string;
  const newPortalRefreshToken = (portalToken.refresh_token as string) ?? portalRefreshToken;
  const expiresIn = (portalToken.expires_in as number) ?? 3600;

  // Step 2: exchange portal access token for Synergia API access token
  const synergiaResp = await fetch(`${LIBRUS_PORTAL_API_URL}/v3/SynergiaAccounts`, {
    headers: {
      Authorization: `Bearer ${newPortalAccessToken}`,
      'User-Agent': LIBRUS_USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!synergiaResp.ok) {
    console.error('SynergiaAccounts refresh failed', { status: synergiaResp.status });
    return null;
  }

  let synergiaData: Record<string, unknown>;
  try {
    synergiaData = await synergiaResp.json();
  } catch {
    return null;
  }

  const account =
    (synergiaData.account as Record<string, unknown>) ??
    ((synergiaData.accounts as Record<string, unknown>[])?.[0] as Record<string, unknown>);
  const apiToken = (account?.accessToken as string) ?? (account?.access_token as string);

  if (!apiToken) {
    console.error('SynergiaAccounts: no accessToken in refresh response');
    return null;
  }

  return { access_token: apiToken, refresh_token: newPortalRefreshToken, expires_in: expiresIn };
}

// ─── ID → name lookup helpers ──────────────────────────────

type IdMap = Record<string | number, string>;

function buildUserMap(usersData: LibrusResponse | null): IdMap {
  const users = (usersData?.Users as Record<string, unknown>[]) ?? [];
  const map: IdMap = {};
  for (const u of users) {
    const id = u.Id as string | number;
    map[id] = [u.FirstName, u.LastName].filter(Boolean).join(' ');
  }
  return map;
}

function buildSubjectMap(subjectsData: LibrusResponse | null): IdMap {
  const subjects = (subjectsData?.Subjects as Record<string, unknown>[]) ?? [];
  const map: IdMap = {};
  for (const s of subjects) {
    map[s.Id as string | number] = s.Name as string;
  }
  return map;
}

function resolveRef(obj: Record<string, unknown> | undefined, field: string, map: IdMap): string {
  const ref = obj?.[field] as Record<string, unknown> | undefined;
  if (!ref?.Id) return '';
  return map[ref.Id as string | number] ?? String(ref.Id);
}

// ─── Content-hash helpers ─────────────────────────────────
// Lightweight djb2 hash — sync, no async crypto overhead.
// Used to detect whether a grade row has actually changed since last sync.

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (((hash << 5) + hash) ^ str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Hash of the meaningful fields of a row (excludes bookkeeping columns). */
function rowHash(row: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { connection_id: _c, external_id: _e, is_new: _n, content_hash: _h, ...rest } = row;
  const sorted = Object.fromEntries(Object.entries(rest).sort(([a], [b]) => a.localeCompare(b)));
  return djb2(JSON.stringify(sorted));
}

// ─── Sync routines ──────────────────────────────────────────

async function syncGrades(
  connectionId: string,
  accessToken: string,
  serviceClient: ReturnType<typeof createClient>,
) {
  // Fetch descriptive/text grades + lookup tables in parallel.
  const [descriptiveGradesData, subjectsData, usersData] = await Promise.all([
    librusGet('DescriptiveGrades', accessToken),
    librusGet('Subjects', accessToken),
    librusGet('Users', accessToken),
  ]);

  const subMap = buildSubjectMap(subjectsData);
  const userMap = buildUserMap(usersData);

  const rawGrades = (descriptiveGradesData?.Grades as Record<string, unknown>[]) ?? [];
  if (!rawGrades.length) return 0;

  const rows: Record<string, unknown>[] = rawGrades
    .map((g) => ({
      connection_id: connectionId,
      external_id: `d_${g.Id}`,
      subject: resolveRef(g, 'Subject', subMap),
      grade: (g.Map as string) ?? (g.RealGradeValue as string) ?? (g.Grade as string) ?? '',
      weight: null,
      category: resolveRef(g, 'Skill', subMap), // descriptive grades use Skill refs
      comment: (g.Phrase as string) ?? null,
      added_by: resolveRef(g, 'AddedBy', userMap),
      // Only use the API-supplied date — no Date() fallback to prevent rowHash drift.
      date: (g.Date as string) ?? (g.AddDate as string) ?? null,
      is_new: false,
    }))
    // Drop any grades the API returned without a date (schema requires non-null).
    .filter((r) => r.date !== null);

  // ── Delete grades removed upstream ─────────────────────
  const currentIds = rows.map((r) => r.external_id as string);
  const { error: delError } = await serviceClient
    .from('school_grades')
    .delete()
    .eq('connection_id', connectionId)
    .not('external_id', 'in', `(${currentIds.map((id) => `"${id}"`).join(',')})`);
  if (delError) throw delError;

  // ── Skip rows whose content hasn't changed ─────────────
  const { data: existing, error: selectError } = await serviceClient
    .from('school_grades')
    .select('external_id, content_hash')
    .eq('connection_id', connectionId);
  if (selectError) throw selectError;

  const storedHash = new Map(
    (existing ?? []).map((r: { external_id: string; content_hash: string }) => [
      r.external_id,
      r.content_hash,
    ]),
  );

  const changedRows = rows
    .map((r) => ({ ...r, content_hash: rowHash(r) }))
    .filter((r) => storedHash.get(r.external_id as string) !== r.content_hash);

  // Nothing to upsert — still return total so counts.grades reflects reality.
  if (!changedRows.length) return rows.length;

  const { error: upsertError } = await serviceClient.from('school_grades').upsert(changedRows, {
    onConflict: 'connection_id,external_id',
    ignoreDuplicates: false,
  });
  if (upsertError) throw upsertError;

  // Return total fetched so counts.grades reflects how many grades exist.
  return rows.length;
}

async function syncTimetable(
  connectionId: string,
  accessToken: string,
  serviceClient: ReturnType<typeof createClient>,
) {
  const subjectsData = await librusGet('Subjects', accessToken);
  const usersData = await librusGet('Users', accessToken);
  const subMap = buildSubjectMap(subjectsData);
  const userMap = buildUserMap(usersData);

  const rows: Record<string, unknown>[] = [];

  // Parse a Timetable response object (keyed by date → slot array) into rows.
  function parseTimetableResponse(timetable: Record<string, unknown>, label: string) {
    const dateKeys = Object.keys(timetable);
    console.log(`syncTimetable: ${label} → ${dateKeys.length} days`);
    for (const [dateStr, dayData] of Object.entries(timetable)) {
      // dayData is an array of lesson-slot arrays: [[lesson, ...], null, ...]
      const daySlots = dayData as (Record<string, unknown>[] | null)[];
      for (const lessonSlot of Array.isArray(daySlots) ? daySlots : []) {
        if (!lessonSlot || !lessonSlot.length) continue;
        for (const lesson of lessonSlot) {
          if (!lesson || typeof lesson !== 'object') continue;
          const subjRef = (lesson.Subject as Record<string, unknown>) ?? {};
          const teacherRef = (lesson.Teacher as Record<string, unknown>) ?? {};
          const classroomRef = (lesson.Classroom as Record<string, unknown>) ?? {};
          rows.push({
            connection_id: connectionId,
            date: dateStr,
            lesson_number: Number(lesson.LessonNo) || null,
            subject: subMap[subjRef.Id as string | number] ?? (subjRef.Name as string) ?? '',
            teacher: userMap[teacherRef.Id as string | number] ?? '',
            classroom: (classroomRef.Name as string) ?? '',
            start_time: (lesson.HourFrom as string) ?? null,
            end_time: (lesson.HourTo as string) ?? null,
            is_substitution: Boolean(lesson.IsSubstitutionClass),
            is_cancelled: Boolean(lesson.IsCanceled),
            substitution_note: (lesson.SubstitutionNote as string) ?? null,
            external_id: `${dateStr}_${lesson.LessonNo}`,
          });
        }
      }
    }
  }

  // Try WeekStart-based fetching (standard accounts).
  // On 400 the API returns alternative Resource endpoints for this account type
  // (e.g. IndividualLearningPath) — try those instead.
  const today = new Date();
  const dayOfWeek = today.getDay() || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + 1);
  const weeks: string[] = [];
  for (let w = 0; w < 2; w++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + w * 7);
    weeks.push(d.toISOString().slice(0, 10));
  }

  let usedFallback = false;
  for (const weekStart of weeks) {
    let data: LibrusResponse | null;
    try {
      data = await librusGet(`Timetables?WeekStart=${weekStart}`, accessToken);
    } catch (err) {
      if (err instanceof Librus400Error && err.resources && !usedFallback) {
        // This account type doesn't support WeekStart — use the Resources endpoints instead.
        usedFallback = true;
        for (const [name, { Url }] of Object.entries(err.resources)) {
          const path = Url.replace(`${LIBRUS_API_URL}/`, '');
          console.log(`syncTimetable: trying fallback endpoint ${name} (${path})`);
          try {
            const altData = await librusGet(path, accessToken);
            if (!altData) {
              console.warn(`syncTimetable: ${name} → null response (403/404)`);
              continue;
            }
            // Standard endpoint: { Timetable: { "YYYY-MM-DD": [...] } }
            // ILP / other endpoints: { Url: "...", Resources: { "YYYY-MM-DD": [...] } }
            const timetableObj =
              altData.Timetable ??
              (altData.Resources &&
              typeof altData.Resources === 'object' &&
              !Array.isArray(altData.Resources)
                ? altData.Resources
                : null);

            if (timetableObj) {
              const firstKey = Object.keys(timetableObj as object)[0] ?? '(empty)';
              console.log(
                `syncTimetable: ${name} → timetable key "${Object.keys(altData).find((k) => altData[k] === timetableObj)}", first date key: ${firstKey}`,
              );
              parseTimetableResponse(timetableObj as Record<string, unknown>, name);
            } else {
              // Dump enough info to understand the response shape
              const preview: Record<string, unknown> = {};
              for (const k of Object.keys(altData).slice(0, 5)) {
                const v = altData[k];
                preview[k] = Array.isArray(v)
                  ? `Array(${(v as unknown[]).length})`
                  : typeof v === 'object' && v !== null
                    ? `object{${Object.keys(v as object)
                        .slice(0, 3)
                        .join(',')}}`
                    : v;
              }
              console.warn(
                `syncTimetable: ${name} → unrecognised shape: ${JSON.stringify(preview)}`,
              );
            }
          } catch (altErr) {
            console.warn(`syncTimetable: fallback ${name} failed: ${String(altErr)}`);
          }
        }
        break; // fallback endpoints return full data, no need to iterate weeks
      }
      throw err; // re-throw other errors
    }
    if (data === null) {
      console.warn(`syncTimetable: week ${weekStart} → API returned null (403/404)`);
      continue;
    }
    if (!data.Timetable) {
      console.warn(
        `syncTimetable: week ${weekStart} → no Timetable key. Keys: ${Object.keys(data).join(', ')}`,
      );
      continue;
    }
    parseTimetableResponse(data.Timetable as Record<string, unknown>, `week ${weekStart}`);
  }

  if (!rows.length) return 0;

  const { error } = await serviceClient.from('school_timetable').upsert(rows, {
    onConflict: 'connection_id,date,lesson_number',
    ignoreDuplicates: false,
  });

  if (error) throw new Error(`Sync timetable DB error: ${error.message}`);
  return rows.length;
}

async function syncHomework(
  connectionId: string,
  accessToken: string,
  serviceClient: ReturnType<typeof createClient>,
) {
  const [hwData, subjectsData, usersData] = await Promise.all([
    librusGet('HomeWorks', accessToken),
    librusGet('Subjects', accessToken),
    librusGet('Users', accessToken),
  ]);

  const homeworks = (hwData?.HomeWorks as Record<string, unknown>[]) ?? [];
  const subMap = buildSubjectMap(subjectsData);
  const userMap = buildUserMap(usersData);

  if (!homeworks.length) return 0;

  const rows = homeworks.map((hw) => ({
    connection_id: connectionId,
    external_id: String(hw.Id),
    subject: resolveRef(hw, 'Subject', subMap),
    description: (hw.Content as string) ?? '',
    date_due: (hw.Date as string) ?? null,
    teacher: resolveRef(hw, 'Teacher', userMap),
    is_new: false,
    is_done: false,
  }));

  const { error } = await serviceClient.from('school_homework').upsert(rows, {
    onConflict: 'connection_id,external_id',
    ignoreDuplicates: true, // don't overwrite is_done
  });

  if (error) console.error('Sync homework error:', error);
  return rows.length;
}

async function syncAttendance(
  connectionId: string,
  accessToken: string,
  serviceClient: ReturnType<typeof createClient>,
) {
  const [attData, typesData, subjectsData, usersData] = await Promise.all([
    librusGet('Attendances', accessToken),
    librusGet('Attendances/Types', accessToken),
    librusGet('Subjects', accessToken),
    librusGet('Users', accessToken),
  ]);

  const attendances = (attData?.Attendances as Record<string, unknown>[]) ?? [];
  const types = (typesData?.Types as Record<string, unknown>[]) ?? [];
  const subMap = buildSubjectMap(subjectsData);
  const userMap = buildUserMap(usersData);

  const typeMap: Record<string | number, { name: string; short: string }> = {};
  for (const t of types) {
    typeMap[t.Id as string | number] = {
      name: t.Name as string,
      short: (t.Short ?? t.ShortName ?? '') as string,
    };
  }

  if (!attendances.length) return 0;

  const rows = attendances.map((a) => {
    const typeRef = (a.Type as Record<string, unknown>) ?? {};
    const typeInfo = typeMap[typeRef.Id as string | number] ?? { name: 'unknown', short: '?' };

    return {
      connection_id: connectionId,
      external_id: String(a.Id),
      date: (a.Date as string) ?? new Date().toISOString().slice(0, 10),
      lesson_number: Number(a.LessonNumber) || null,
      subject: resolveRef(a, 'Subject', subMap),
      type: typeInfo.name,
      type_short: typeInfo.short,
      teacher: resolveRef(a, 'AddedBy', userMap),
      is_new: false,
    };
  });

  const { error } = await serviceClient.from('school_attendance').upsert(rows, {
    onConflict: 'connection_id,external_id',
    ignoreDuplicates: false,
  });

  if (error) console.error('Sync attendance error:', error);
  return rows.length;
}

async function syncMessages(
  connectionId: string,
  accessToken: string,
  direction: 'inbox' | 'sent',
  serviceClient: ReturnType<typeof createClient>,
) {
  const endpoint = direction === 'inbox' ? 'Messages' : 'Messages/Sent';

  // Fetch messages list + users in parallel for sender name resolution.
  // Sender/Receivers in the list are refs {Id, Url} — NOT inline name objects.
  const [data, usersData] = await Promise.all([
    librusGet(endpoint, accessToken),
    librusGet('Users', accessToken),
  ]);

  if (data === null) {
    // 403/404 → this account type doesn't support Messages.
    console.warn(
      `syncMessages(${direction}): endpoint ${endpoint} returned null (403/404) \u2014 feature unavailable for this account`,
    );
    return 0;
  }

  const messages = (data?.Messages as Record<string, unknown>[]) ?? [];
  if (!messages.length) {
    console.log(
      `syncMessages(${direction}): empty list. Top-level keys: ${Object.keys(data).join(', ')}`,
    );
    return 0;
  }

  const userMap = buildUserMap(usersData);

  // Fetch bodies in parallel — the list endpoint omits Body.
  // Cap at 30 to avoid excessive requests.
  const bodyMap = new Map<string, string>();
  const toFetch = messages.slice(0, 30);
  const bodyResults = await Promise.allSettled(
    toFetch.map((m) => librusGet(`Messages/${m.Id}`, accessToken)),
  );
  for (let i = 0; i < toFetch.length; i++) {
    const r = bodyResults[i];
    const id = String(toFetch[i].Id);
    if (r.status === 'fulfilled' && r.value) {
      const msgObj = r.value.Message as Record<string, unknown> | undefined;
      const body = (msgObj?.Body as string) ?? (r.value.Body as string) ?? null;
      if (body) bodyMap.set(id, body);
    }
  }

  const rows = messages.map((m) => {
    const id = String(m.Id);
    // Sender is a ref {Id, Url} — resolve via userMap
    const senderRef = m.Sender as Record<string, unknown> | undefined;
    const senderName = senderRef?.Id ? (userMap[senderRef.Id as string | number] ?? null) : null;

    // Receivers/Recipients are also refs
    const recipientRefs = (m.Receivers as Record<string, unknown>[]) ?? [];
    const recipientNames = recipientRefs
      .map((r) => userMap[r.Id as string | number] ?? '')
      .filter(Boolean);

    return {
      connection_id: connectionId,
      external_id: id,
      direction,
      sender: senderName,
      recipients: recipientNames,
      subject: (m.Subject as string) ?? '(no subject)',
      body: bodyMap.get(id) ?? null,
      sent_at: (m.SendDate as string) ?? null,
      is_read: Boolean(m.IsRead),
      is_new: false,
    };
  });

  const { error } = await serviceClient.from('school_messages').upsert(rows, {
    onConflict: 'connection_id,external_id',
    ignoreDuplicates: false,
  });

  if (error) throw new Error(`Sync messages (${direction}) DB error: ${error.message}`);
  return rows.length;
}

async function syncAnnouncements(
  connectionId: string,
  accessToken: string,
  serviceClient: ReturnType<typeof createClient>,
) {
  const [data, usersData] = await Promise.all([
    librusGet('SchoolNotices', accessToken),
    librusGet('Users', accessToken),
  ]);

  const notices = (data?.SchoolNotices as Record<string, unknown>[]) ?? [];
  const userMap = buildUserMap(usersData);

  if (!notices.length) return 0;

  const rows = notices.map((n) => ({
    connection_id: connectionId,
    external_id: String(n.Id),
    title: (n.Subject as string) ?? '(no title)',
    content: (n.Content as string) ?? null,
    author: resolveRef(n, 'AddedBy', userMap),
    published_at: (n.CreationDate as string) ?? null,
    is_new: false,
  }));

  const { error } = await serviceClient.from('school_announcements').upsert(rows, {
    onConflict: 'connection_id,external_id',
    ignoreDuplicates: false,
  });

  if (error) console.error('Sync announcements error:', error);
  return rows.length;
}

/**
 * Fetch today's lucky number (Szczęśliwy numerek) from LuckyNumbers endpoint.
 * Returns null silently if unavailable for this account type.
 */
async function fetchLuckyNumber(
  accessToken: string,
): Promise<{ number: number; day: string } | null> {
  const data = await librusGet('LuckyNumbers', accessToken);
  const ln = data?.LuckyNumber as Record<string, unknown> | undefined;
  if (!ln?.LuckyNumber) return null;
  return {
    number: Number(ln.LuckyNumber),
    day: String(ln.LuckyNumberDay),
  };
}

// ─── Main handler ───────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { connection_id } = body as { connection_id?: string };
  if (!connection_id) return json({ error: 'connection_id is required' }, 400);

  // Load connection (RLS ensures caller is a household member)
  const { data: conn, error: connErr } = await userClient
    .from('school_connections')
    .select('id, access_token, refresh_token, token_expiry, platform, is_active')
    .eq('id', connection_id)
    .single();

  if (connErr || !conn) {
    return json({ error: 'Connection not found or access denied' }, 404);
  }

  if (conn.platform !== 'librus') {
    return json({ error: `Platform "${conn.platform}" not supported yet` }, 400);
  }

  let accessToken = conn.access_token as string;

  // ── Auto-refresh token if expired ──────────────────────
  const expiryTime = conn.token_expiry ? new Date(conn.token_expiry as string).getTime() : 0;
  if (!accessToken || Date.now() > expiryTime - 60_000) {
    const rt = conn.refresh_token as string;
    if (!rt) return json({ error: 'No refresh token – please reconnect' }, 401);

    const newTokens = await refreshToken(rt);
    if (!newTokens) {
      await serviceClient
        .from('school_connections')
        .update({ sync_error: 'Token refresh failed – please reconnect' })
        .eq('id', connection_id);
      return json({ error: 'Token refresh failed – please reconnect' }, 502);
    }

    accessToken = newTokens.access_token;
    await serviceClient
      .from('school_connections')
      .update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        token_expiry: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        sync_error: null,
      })
      .eq('id', connection_id);
  }

  // ── Run all sync tasks in parallel ─────────────────────
  const results = await Promise.allSettled([
    syncGrades(connection_id, accessToken, serviceClient),
    syncTimetable(connection_id, accessToken, serviceClient),
    syncHomework(connection_id, accessToken, serviceClient),
    syncAttendance(connection_id, accessToken, serviceClient),
    syncMessages(connection_id, accessToken, 'inbox', serviceClient),
    syncMessages(connection_id, accessToken, 'sent', serviceClient),
    syncAnnouncements(connection_id, accessToken, serviceClient),
    fetchLuckyNumber(accessToken).catch(() => null), // non-critical — never fail the sync
  ]);

  const [gradesR, timetableR, homeworkR, attendanceR, inboxR, sentR, announcementsR, luckyR] =
    results;

  const luckyData = luckyR.status === 'fulfilled' ? luckyR.value : null;
  if (luckyData) console.log(`Lucky number today (${luckyData.day}): ${luckyData.number}`);

  const counts = {
    grades: gradesR.status === 'fulfilled' ? gradesR.value : 0,
    timetable: timetableR.status === 'fulfilled' ? timetableR.value : 0,
    homework: homeworkR.status === 'fulfilled' ? homeworkR.value : 0,
    attendance: attendanceR.status === 'fulfilled' ? attendanceR.value : 0,
    messages_inbox: inboxR.status === 'fulfilled' ? inboxR.value : 0,
    messages_sent: sentR.status === 'fulfilled' ? sentR.value : 0,
    announcements: announcementsR.status === 'fulfilled' ? announcementsR.value : 0,
  };

  const errors = results
    .slice(0, 7) // only the 7 sync tasks — luckyNumber is non-critical
    .map((r, i) => (r.status === 'rejected' ? { task: i, reason: String(r.reason) } : null))
    .filter(Boolean);

  // Update last_synced_at and (if available) today's lucky number
  await serviceClient
    .from('school_connections')
    .update({
      last_synced_at: new Date().toISOString(),
      sync_error: errors.length > 0 ? `Partial sync errors: ${errors.length}` : null,
      ...(luckyData ? { lucky_number: luckyData.number, lucky_number_day: luckyData.day } : {}),
    })
    .eq('id', connection_id);

  return json({ ok: true, counts, errors });
});
