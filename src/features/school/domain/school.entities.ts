/**
 * School Integration – Domain Entities
 * Covers Librus Synergia (and future platforms).
 */

export type SchoolPlatform = 'librus' | 'vulcan' | 'podlasie';

// ─── Connection ──────────────────────────────────────────
export interface SchoolConnection {
  id: string;
  household_id: string;
  member_id: string;
  platform: SchoolPlatform;
  display_label: string;
  student_name: string | null;
  class_name: string | null;
  school_name: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  sync_error: string | null;
  token_expiry: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectSchoolDto {
  household_id: string;
  member_id: string;
  username: string;
  password: string;
}

// ─── Grades ──────────────────────────────────────────────
export interface SchoolGrade {
  id: string;
  connection_id: string;
  subject: string;
  grade: string;
  weight: number | null;
  category: string | null;
  comment: string | null;
  added_by: string | null;
  date: string;
  is_new: boolean;
  external_id: string | null;
  created_at: string;
}

// ─── Timetable ───────────────────────────────────────────
export interface SchoolLesson {
  id: string;
  connection_id: string;
  date: string;
  lesson_number: number | null;
  subject: string;
  teacher: string | null;
  classroom: string | null;
  start_time: string | null;
  end_time: string | null;
  is_substitution: boolean;
  is_cancelled: boolean;
  substitution_note: string | null;
  external_id: string | null;
  created_at: string;
}

// ─── Homework ────────────────────────────────────────────
export interface SchoolHomework {
  id: string;
  connection_id: string;
  subject: string;
  description: string;
  date_due: string | null;
  teacher: string | null;
  is_new: boolean;
  is_done: boolean;
  external_id: string | null;
  created_at: string;
}

// ─── Attendance ──────────────────────────────────────────
export interface SchoolAttendance {
  id: string;
  connection_id: string;
  date: string;
  lesson_number: number | null;
  subject: string | null;
  type: string;
  type_short: string | null;
  teacher: string | null;
  is_new: boolean;
  external_id: string | null;
  created_at: string;
}

// ─── Messages ────────────────────────────────────────────
export type MessageDirection = 'inbox' | 'sent';

export interface SchoolMessage {
  id: string;
  connection_id: string;
  direction: MessageDirection;
  sender: string | null;
  recipients: string[] | null;
  subject: string;
  body: string | null;
  sent_at: string | null;
  is_read: boolean;
  is_new: boolean;
  external_id: string | null;
  created_at: string;
}

// ─── Announcements ───────────────────────────────────────
export interface SchoolAnnouncement {
  id: string;
  connection_id: string;
  title: string;
  content: string | null;
  author: string | null;
  published_at: string | null;
  is_new: boolean;
  external_id: string | null;
  created_at: string;
}

// ─── API Response Shapes ──────────────────────────────────
export interface SyncResult {
  ok: boolean;
  counts: {
    grades: number;
    timetable: number;
    homework: number;
    attendance: number;
    messages_inbox: number;
    messages_sent: number;
    announcements: number;
  };
  errors: { task: number; reason: string }[];
}

export interface ConnectResult {
  ok: boolean;
  connection: Pick<
    SchoolConnection,
    | 'id'
    | 'display_label'
    | 'student_name'
    | 'class_name'
    | 'school_name'
    | 'is_active'
    | 'created_at'
  >;
}
