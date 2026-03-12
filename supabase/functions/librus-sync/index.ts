/// <reference lib="deno.ns" />
// Edge Function: librus-sync
// Fetches student data from Librus Synergia API and caches it in Supabase tables.
//
// POST /librus-sync { connection_id, since?: ISO date string }

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const LIBRUS_API_URL = 'https://api.librus.pl/2.0';
const LIBRUS_API_TOKEN_URL = 'https://api.librus.pl/OAuth/Token';
// User-Agent must include the Android Dalvik prefix or Librus rejects the request.
// Source: https://github.com/szkolny-eu/szkolny-android/blob/master/app/src/main/java/pl/szczodrzynski/edziennik/data/api/Constants.kt
const LIBRUS_USER_AGENT =
  'Dalvik/2.1.0 (Linux; U; Android 11; Android SDK built for x86) LibrusMobileApp';
// Public client credentials (can be overridden via Supabase secret LIBRUS_API_AUTHORIZATION).
const LIBRUS_API_AUTHORIZATION =
  Deno.env.get('LIBRUS_API_AUTHORIZATION') ?? 'Mjg6ODRmZGQzYTg3YjAzZDNlYTZmZmU3NzdiNThiMzMyYjE=';

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

async function librusGet(endpoint: string, accessToken: string): Promise<LibrusResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const resp = await fetch(`${LIBRUS_API_URL}/${endpoint}`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': LIBRUS_USER_AGENT,
      },
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`Librus GET /${endpoint} ${resp.status}: ${body}`);
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

async function refreshToken(refreshTokenStr: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTokenStr,
    librus_long_term_token: '1',
    librus_rules_accepted: '1',
  });

  // Pass URLSearchParams directly — Deno sets Content-Type automatically.
  const resp = await fetch(LIBRUS_API_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${LIBRUS_API_AUTHORIZATION}`,
      'User-Agent': LIBRUS_USER_AGENT,
    },
    body,
  });
  if (!resp.ok) return null;
  return resp.json();
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

function buildCategoryMap(categoriesData: LibrusResponse | null, key: string): IdMap {
  const cats = (categoriesData?.[key] as Record<string, unknown>[]) ?? [];
  const map: IdMap = {};
  for (const c of cats) {
    map[c.Id as string | number] = c.Name as string;
  }
  return map;
}

function resolveRef(obj: Record<string, unknown> | undefined, field: string, map: IdMap): string {
  const ref = obj?.[field] as Record<string, unknown> | undefined;
  if (!ref?.Id) return '';
  return map[ref.Id as string | number] ?? String(ref.Id);
}

// ─── Sync routines ──────────────────────────────────────────

async function syncGrades(
  connectionId: string,
  accessToken: string,
  serviceClient: ReturnType<typeof createClient>,
) {
  const [gradesData, categoriesData, subjectsData, usersData] = await Promise.all([
    librusGet('Grades', accessToken),
    librusGet('Grades/Categories', accessToken),
    librusGet('Subjects', accessToken),
    librusGet('Users', accessToken),
  ]);

  const grades = (gradesData?.Grades as Record<string, unknown>[]) ?? [];
  const catMap = buildCategoryMap(categoriesData, 'Categories');
  const subMap = buildSubjectMap(subjectsData);
  const userMap = buildUserMap(usersData);

  if (!grades.length) return 0;

  const rows = grades.map((g) => ({
    connection_id: connectionId,
    external_id: String(g.Id),
    subject: resolveRef(g as Record<string, unknown>, 'Subject', subMap),
    grade: String(g.Grade ?? ''),
    weight: Number(g.Weight) || null,
    category: resolveRef(g as Record<string, unknown>, 'Category', catMap),
    comment: (g.Comments as string) ?? null,
    added_by: resolveRef(g as Record<string, unknown>, 'AddedBy', userMap),
    date: (g.Date as string) ?? new Date().toISOString().slice(0, 10),
    is_new: false,
  }));

  const { error } = await serviceClient.from('school_grades').upsert(rows, {
    onConflict: 'connection_id,external_id',
    ignoreDuplicates: false,
  });

  if (error) console.error('Sync grades error:', error);
  return rows.length;
}

async function syncTimetable(
  connectionId: string,
  accessToken: string,
  serviceClient: ReturnType<typeof createClient>,
) {
  // Librus timetable requires a week param: WeekStart=YYYY-MM-DD
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

  const subjectsData = await librusGet('Subjects', accessToken);
  const usersData = await librusGet('Users', accessToken);
  const subMap = buildSubjectMap(subjectsData);
  const userMap = buildUserMap(usersData);

  const rows: Record<string, unknown>[] = [];

  for (const weekStart of weeks) {
    const data = await librusGet(`Timetables?WeekStart=${weekStart}`, accessToken);
    const timetable = (data?.Timetable as Record<string, unknown>) ?? {};

    for (const [dateStr, dayData] of Object.entries(timetable)) {
      const dayLessons = dayData as Record<string, unknown[]>;
      for (const [lessonNum, lessonArr] of Object.entries(dayLessons)) {
        const lesson = lessonArr?.[0] as Record<string, unknown>;
        if (!lesson) continue;

        const lessonData = (lesson.Lesson as Record<string, unknown>) ?? {};
        const subjRef = (lessonData.Subject as Record<string, unknown>) ?? {};
        const teacherRef = (lessonData.Teacher as Record<string, unknown>) ?? {};
        const classroomRef = (lesson.Classroom as Record<string, unknown>) ?? {};

        rows.push({
          connection_id: connectionId,
          date: dateStr,
          lesson_number: Number(lessonNum),
          subject: subMap[subjRef.Id as string | number] ?? (subjRef.Name as string) ?? '',
          teacher: userMap[teacherRef.Id as string | number] ?? '',
          classroom: (classroomRef.Name as string) ?? '',
          start_time: (lesson.HourFrom as string) ?? null,
          end_time: (lesson.HourTo as string) ?? null,
          is_substitution: Boolean(lesson.IsSubstitutionClass),
          is_cancelled: Boolean(lesson.IsCanceled),
          substitution_note: (lesson.SubstitutionNote as string) ?? null,
          external_id: `${dateStr}_${lessonNum}`,
        });
      }
    }
  }

  if (!rows.length) return 0;

  const { error } = await serviceClient.from('school_timetable').upsert(rows, {
    onConflict: 'connection_id,date,lesson_number',
    ignoreDuplicates: false,
  });

  if (error) console.error('Sync timetable error:', error);
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
  const data = await librusGet(endpoint, accessToken);
  const messages = (data?.Messages as Record<string, unknown>[]) ?? [];

  if (!messages.length) return 0;

  const rows = messages.map((m) => {
    const sender = m.Sender as Record<string, unknown>;
    const senderName = sender ? [sender.FirstName, sender.LastName].filter(Boolean).join(' ') : '';

    const recipients = (m.Receivers as Record<string, unknown>[]) ?? [];
    const recipientNames = recipients.map((r) =>
      [r.FirstName, r.LastName].filter(Boolean).join(' '),
    );

    return {
      connection_id: connectionId,
      external_id: String(m.Id),
      direction,
      sender: senderName || null,
      recipients: recipientNames,
      subject: (m.Subject as string) ?? '(no subject)',
      body: (m.Body as string) ?? null,
      sent_at: (m.SendDate as string) ?? null,
      is_read: Boolean(m.IsRead),
      is_new: false,
    };
  });

  const { error } = await serviceClient.from('school_messages').upsert(rows, {
    onConflict: 'connection_id,external_id',
    ignoreDuplicates: false,
  });

  if (error) console.error(`Sync messages (${direction}) error:`, error);
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
    .eq('is_active', true)
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
        .update({ sync_error: 'Token refresh failed – please reconnect', is_active: false })
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
  ]);

  const [gradesR, timetableR, homeworkR, attendanceR, inboxR, sentR, announcementsR] = results;

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
    .map((r, i) => (r.status === 'rejected' ? { task: i, reason: String(r.reason) } : null))
    .filter(Boolean);

  // Update last_synced_at
  await serviceClient
    .from('school_connections')
    .update({
      last_synced_at: new Date().toISOString(),
      sync_error: errors.length > 0 ? `Partial sync errors: ${errors.length}` : null,
    })
    .eq('id', connection_id);

  return json({ ok: true, counts, errors });
});
