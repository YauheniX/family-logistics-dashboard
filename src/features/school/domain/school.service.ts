import { schoolRepository } from '../infrastructure/school.repository';
import type { ApiResponse } from '@/features/shared/domain/repository.interface';
import type {
  SchoolConnection,
  SchoolGrade,
  SchoolLesson,
  SchoolHomework,
  SchoolAttendance,
  SchoolMessage,
  SchoolAnnouncement,
  ConnectSchoolDto,
  ConnectResult,
  SyncResult,
  MessageDirection,
} from './school.entities';

/**
 * School service – business logic for school data integration.
 */
export class SchoolService {
  // ── Connections ───────────────────────────────────────

  async connectSchool(dto: ConnectSchoolDto): Promise<ApiResponse<ConnectResult>> {
    return schoolRepository.connect(dto);
  }

  async disconnectSchool(connectionId: string): Promise<ApiResponse<{ ok: boolean }>> {
    return schoolRepository.disconnect(connectionId);
  }

  async getConnections(householdId: string): Promise<ApiResponse<SchoolConnection[]>> {
    return schoolRepository.getConnections(householdId);
  }

  // ── Sync ──────────────────────────────────────────────

  async sync(connectionId: string): Promise<ApiResponse<SyncResult>> {
    return schoolRepository.sync(connectionId);
  }

  // ── Grades ────────────────────────────────────────────

  async getGrades(connectionId: string): Promise<ApiResponse<SchoolGrade[]>> {
    return schoolRepository.getGrades(connectionId);
  }

  /**
   * Groups grades by subject.
   */
  groupGradesBySubject(grades: SchoolGrade[]): Record<string, SchoolGrade[]> {
    return grades.reduce<Record<string, SchoolGrade[]>>((acc, grade) => {
      const key = grade.subject || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(grade);
      return acc;
    }, {});
  }

  /**
   * Calculate a simple weighted average for a list of grades (numeric).
   */
  calculateAverage(grades: SchoolGrade[]): number | null {
    const numeric = grades
      .map((g) => ({ value: parseFloat(g.grade), weight: g.weight ?? 1 }))
      .filter((g) => !isNaN(g.value));

    if (!numeric.length) return null;

    const totalWeight = numeric.reduce((s, g) => s + g.weight, 0);
    const weighted = numeric.reduce((s, g) => s + g.value * g.weight, 0);
    return Math.round((weighted / totalWeight) * 100) / 100;
  }

  // ── Timetable ─────────────────────────────────────────

  async getTodayTimetable(connectionId: string): Promise<ApiResponse<SchoolLesson[]>> {
    return schoolRepository.getTodayTimetable(connectionId);
  }

  async getWeekTimetable(connectionId: string): Promise<ApiResponse<SchoolLesson[]>> {
    return schoolRepository.getWeekTimetable(connectionId);
  }

  /**
   * Groups timetable lessons by date.
   */
  groupLessonsByDate(lessons: SchoolLesson[]): Record<string, SchoolLesson[]> {
    return lessons.reduce<Record<string, SchoolLesson[]>>((acc, lesson) => {
      if (!acc[lesson.date]) acc[lesson.date] = [];
      acc[lesson.date].push(lesson);
      return acc;
    }, {});
  }

  // ── Homework ──────────────────────────────────────────

  async getHomework(connectionId: string): Promise<ApiResponse<SchoolHomework[]>> {
    return schoolRepository.getHomework(connectionId);
  }

  async markHomeworkDone(
    homeworkId: string,
    isDone: boolean,
  ): Promise<ApiResponse<SchoolHomework>> {
    return schoolRepository.markHomeworkDone(homeworkId, isDone);
  }

  /**
   * Returns pending (not done) homework ordered by due date.
   */
  getPendingHomework(homework: SchoolHomework[]): SchoolHomework[] {
    return [...homework]
      .filter((h) => !h.is_done)
      .sort((a, b) => {
        if (!a.date_due) return 1;
        if (!b.date_due) return -1;
        return a.date_due.localeCompare(b.date_due);
      });
  }

  // ── Attendance ────────────────────────────────────────

  async getAttendance(connectionId: string): Promise<ApiResponse<SchoolAttendance[]>> {
    return schoolRepository.getAttendance(connectionId);
  }

  /**
   * Counts absences by type.
   */
  countAbsencesByType(records: SchoolAttendance[]): Record<string, number> {
    return records.reduce<Record<string, number>>((acc, r) => {
      const key = r.type_short ?? r.type;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }

  // ── Messages ──────────────────────────────────────────

  async getMessages(
    connectionId: string,
    direction: MessageDirection = 'inbox',
  ): Promise<ApiResponse<SchoolMessage[]>> {
    return schoolRepository.getMessages(connectionId, direction);
  }

  // ── Announcements ─────────────────────────────────────

  async getAnnouncements(connectionId: string): Promise<ApiResponse<SchoolAnnouncement[]>> {
    return schoolRepository.getAnnouncements(connectionId);
  }
}

export const schoolService = new SchoolService();
