import { supabase } from '@/features/shared/infrastructure/supabase.client';
import type { ApiResponse } from '@/features/shared/domain/repository.interface';
import type {
  SchoolConnection,
  SchoolGrade,
  SchoolLesson,
  SchoolHomework,
  SchoolAttendance,
  SchoolMessage,
  SchoolAnnouncement,
  ConnectResult,
  SyncResult,
  ConnectSchoolDto,
  MessageDirection,
} from '../domain/school.entities';

// ─── Edge Function invocation helper ─────────────────────

async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  // Explicitly fetch the session and forward the Bearer token.
  // supabase.functions.invoke() does this internally too, but only when its
  // internal GoTrueClient finds the session under the configured storageKey.
  // Being explicit avoids a silent 401 if that lookup ever misses.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { data: null, error: { message: 'Not authenticated. Please sign in and try again.' } };
  }

  const { data, error } = await supabase.functions.invoke<T>(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) return { data: null, error: { message: error.message } };
  return { data: data as T, error: null };
}

// Supabase client cast for school tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── School Repository ────────────────────────────────────

export class SchoolRepository {
  // ── Connection management ──────────────────────────────

  async connect(dto: ConnectSchoolDto): Promise<ApiResponse<ConnectResult>> {
    return invokeFunction<ConnectResult>('librus-auth', { action: 'connect', ...dto });
  }

  async disconnect(connectionId: string): Promise<ApiResponse<{ ok: boolean }>> {
    return invokeFunction<{ ok: boolean }>('librus-auth', {
      action: 'disconnect',
      connection_id: connectionId,
    });
  }

  async refreshToken(
    connectionId: string,
  ): Promise<ApiResponse<{ ok: boolean; token_expiry: string }>> {
    return invokeFunction('librus-auth', {
      action: 'refresh',
      connection_id: connectionId,
    });
  }

  /**
   * List all school connections for a household.
   */
  async getConnections(householdId: string): Promise<ApiResponse<SchoolConnection[]>> {
    const { data, error } = await db
      .from('school_connections')
      .select(
        'id, household_id, member_id, platform, display_label, student_name, class_name, school_name, is_active, last_synced_at, sync_error, token_expiry, created_at, updated_at',
      )
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as SchoolConnection[], error: null };
  }

  // ── Sync ───────────────────────────────────────────────

  async sync(connectionId: string): Promise<ApiResponse<SyncResult>> {
    return invokeFunction<SyncResult>('librus-sync', { connection_id: connectionId });
  }

  // ── Grades ─────────────────────────────────────────────

  async getGrades(connectionId: string): Promise<ApiResponse<SchoolGrade[]>> {
    const { data, error } = await db
      .from('school_grades')
      .select('*')
      .eq('connection_id', connectionId)
      .order('date', { ascending: false });

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as SchoolGrade[], error: null };
  }

  // ── Timetable ──────────────────────────────────────────

  async getTimetable(
    connectionId: string,
    fromDate: string,
    toDate: string,
  ): Promise<ApiResponse<SchoolLesson[]>> {
    const { data, error } = await db
      .from('school_timetable')
      .select('*')
      .eq('connection_id', connectionId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true })
      .order('lesson_number', { ascending: true });

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as SchoolLesson[], error: null };
  }

  async getTodayTimetable(connectionId: string): Promise<ApiResponse<SchoolLesson[]>> {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return this.getTimetable(connectionId, today, today);
  }

  async getWeekTimetable(connectionId: string): Promise<ApiResponse<SchoolLesson[]>> {
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    const friday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return this.getTimetable(connectionId, fmt(monday), fmt(friday));
  }

  // ── Homework ───────────────────────────────────────────

  async getHomework(connectionId: string): Promise<ApiResponse<SchoolHomework[]>> {
    const { data, error } = await db
      .from('school_homework')
      .select('*')
      .eq('connection_id', connectionId)
      .order('date_due', { ascending: true, nullsFirst: false });

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as SchoolHomework[], error: null };
  }

  async markHomeworkDone(
    homeworkId: string,
    isDone: boolean,
  ): Promise<ApiResponse<SchoolHomework>> {
    const { data, error } = await db
      .from('school_homework')
      .update({ is_done: isDone })
      .eq('id', homeworkId)
      .select()
      .single();

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as SchoolHomework, error: null };
  }

  // ── Attendance ─────────────────────────────────────────

  async getAttendance(connectionId: string, limit = 50): Promise<ApiResponse<SchoolAttendance[]>> {
    const { data, error } = await db
      .from('school_attendance')
      .select('*')
      .eq('connection_id', connectionId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as SchoolAttendance[], error: null };
  }

  // ── Messages ───────────────────────────────────────────

  async getMessages(
    connectionId: string,
    direction: MessageDirection = 'inbox',
    limit = 30,
  ): Promise<ApiResponse<SchoolMessage[]>> {
    const { data, error } = await db
      .from('school_messages')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('direction', direction)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as SchoolMessage[], error: null };
  }

  // ── Announcements ──────────────────────────────────────

  async getAnnouncements(connectionId: string): Promise<ApiResponse<SchoolAnnouncement[]>> {
    const { data, error } = await db
      .from('school_announcements')
      .select('*')
      .eq('connection_id', connectionId)
      .order('published_at', { ascending: false });

    if (error) return { data: null, error: { message: error.message } };
    return { data: data as SchoolAnnouncement[], error: null };
  }
}

export const schoolRepository = new SchoolRepository();
