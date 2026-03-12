import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock repository + supabase so module-level imports don't fail in test env
vi.mock('@/features/school/infrastructure/school.repository', () => ({
  schoolRepository: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getConnections: vi.fn(),
    sync: vi.fn(),
    getGrades: vi.fn(),
    getTimetable: vi.fn(),
    getWeekTimetable: vi.fn(),
    getHomework: vi.fn(),
    markHomeworkDone: vi.fn(),
    getAttendance: vi.fn(),
    getMessages: vi.fn(),
    getAnnouncements: vi.fn(),
  },
}));

import { SchoolService } from '@/features/school/domain/school.service';
import type {
  SchoolGrade,
  SchoolLesson,
  SchoolHomework,
  SchoolAttendance,
} from '@/features/school/domain/school.entities';

// ─── Helpers ──────────────────────────────────────────────
function makeGrade(overrides: Partial<SchoolGrade> = {}): SchoolGrade {
  return {
    id: 'g1',
    connection_id: 'c1',
    subject: 'Math',
    grade: '5',
    weight: 1,
    category: null,
    comment: null,
    added_by: null,
    date: '2025-09-01',
    is_new: false,
    external_id: null,
    created_at: '2025-09-01T00:00:00Z',
    ...overrides,
  };
}

function makeLesson(overrides: Partial<SchoolLesson> = {}): SchoolLesson {
  return {
    id: 'l1',
    connection_id: 'c1',
    date: '2025-09-15',
    lesson_number: 1,
    subject: 'Math',
    teacher: null,
    classroom: null,
    start_time: '08:00',
    end_time: '08:45',
    is_substitution: false,
    is_cancelled: false,
    substitution_note: null,
    external_id: null,
    created_at: '2025-09-15T00:00:00Z',
    ...overrides,
  };
}

function makeHomework(overrides: Partial<SchoolHomework> = {}): SchoolHomework {
  return {
    id: 'hw1',
    connection_id: 'c1',
    subject: 'Math',
    description: 'Do exercises 1-5',
    date_due: '2025-09-20',
    teacher: null,
    is_new: false,
    is_done: false,
    external_id: null,
    created_at: '2025-09-15T00:00:00Z',
    ...overrides,
  };
}

function makeAttendance(overrides: Partial<SchoolAttendance> = {}): SchoolAttendance {
  return {
    id: 'a1',
    connection_id: 'c1',
    date: '2025-09-15',
    lesson_number: 1,
    subject: 'Math',
    type: 'Nieobecność',
    type_short: 'nb',
    teacher: null,
    is_new: false,
    external_id: null,
    created_at: '2025-09-15T00:00:00Z',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────

describe('SchoolService (pure business logic)', () => {
  let service: SchoolService;

  beforeEach(() => {
    // SchoolService has no constructor dependencies for pure methods
    service = new SchoolService();
  });

  // ── groupGradesBySubject ────────────────────────────────

  describe('groupGradesBySubject', () => {
    it('groups grades by subject', () => {
      const grades: SchoolGrade[] = [
        makeGrade({ id: 'g1', subject: 'Math', grade: '5' }),
        makeGrade({ id: 'g2', subject: 'Polish', grade: '4' }),
        makeGrade({ id: 'g3', subject: 'Math', grade: '3' }),
      ];

      const result = service.groupGradesBySubject(grades);

      expect(Object.keys(result)).toEqual(['Math', 'Polish']);
      expect(result['Math']).toHaveLength(2);
      expect(result['Polish']).toHaveLength(1);
    });

    it('returns empty object for empty input', () => {
      expect(service.groupGradesBySubject([])).toEqual({});
    });

    it('falls back to "Other" for grades with empty subject', () => {
      const grades = [makeGrade({ subject: '' })];
      const result = service.groupGradesBySubject(grades);
      expect(result['Other']).toHaveLength(1);
    });
  });

  // ── calculateAverage ────────────────────────────────────

  describe('calculateAverage', () => {
    it('calculates unweighted average', () => {
      const grades = [
        makeGrade({ grade: '5', weight: null }),
        makeGrade({ grade: '3', weight: null }),
      ];
      // weight defaults to 1 when null; avg = (5+3)/2 = 4
      expect(service.calculateAverage(grades)).toBe(4);
    });

    it('calculates weighted average', () => {
      const grades = [makeGrade({ grade: '5', weight: 2 }), makeGrade({ grade: '3', weight: 1 })];
      // (5*2 + 3*1) / (2+1) = 13/3 ≈ 4.33
      expect(service.calculateAverage(grades)).toBe(4.33);
    });

    it('returns null for empty list', () => {
      expect(service.calculateAverage([])).toBeNull();
    });

    it('ignores non-numeric grades', () => {
      const grades = [
        makeGrade({ grade: '5', weight: 1 }),
        makeGrade({ grade: 'bz', weight: 1 }), // non-numeric = ignored
      ];
      expect(service.calculateAverage(grades)).toBe(5);
    });

    it('returns null when all grades are non-numeric', () => {
      const grades = [makeGrade({ grade: 'bz' }), makeGrade({ grade: '+' })];
      expect(service.calculateAverage(grades)).toBeNull();
    });
  });

  // ── groupLessonsByDate ───────────────────────────────────

  describe('groupLessonsByDate', () => {
    it('groups lessons by date', () => {
      const lessons: SchoolLesson[] = [
        makeLesson({ id: 'l1', date: '2025-09-15', lesson_number: 1 }),
        makeLesson({ id: 'l2', date: '2025-09-16', lesson_number: 1 }),
        makeLesson({ id: 'l3', date: '2025-09-15', lesson_number: 2 }),
      ];

      const result = service.groupLessonsByDate(lessons);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['2025-09-15']).toHaveLength(2);
      expect(result['2025-09-16']).toHaveLength(1);
    });

    it('returns empty object for empty input', () => {
      expect(service.groupLessonsByDate([])).toEqual({});
    });
  });

  // ── getPendingHomework ──────────────────────────────────

  describe('getPendingHomework', () => {
    it('filters out done homework', () => {
      const homework: SchoolHomework[] = [
        makeHomework({ id: 'hw1', is_done: false, date_due: '2025-09-20' }),
        makeHomework({ id: 'hw2', is_done: true, date_due: '2025-09-18' }),
        makeHomework({ id: 'hw3', is_done: false, date_due: '2025-09-18' }),
      ];

      const result = service.getPendingHomework(homework);

      expect(result).toHaveLength(2);
      expect(result.every((h) => !h.is_done)).toBe(true);
    });

    it('sorts pending homework by due date ascending', () => {
      const homework: SchoolHomework[] = [
        makeHomework({ id: 'hw1', date_due: '2025-09-25', is_done: false }),
        makeHomework({ id: 'hw2', date_due: '2025-09-18', is_done: false }),
        makeHomework({ id: 'hw3', date_due: '2025-09-20', is_done: false }),
      ];

      const result = service.getPendingHomework(homework);

      expect(result[0].id).toBe('hw2');
      expect(result[1].id).toBe('hw3');
      expect(result[2].id).toBe('hw1');
    });

    it('puts null due dates at the end', () => {
      const homework: SchoolHomework[] = [
        makeHomework({ id: 'hw1', date_due: null, is_done: false }),
        makeHomework({ id: 'hw2', date_due: '2025-09-18', is_done: false }),
      ];

      const result = service.getPendingHomework(homework);

      expect(result[0].id).toBe('hw2');
      expect(result[1].id).toBe('hw1');
    });

    it('returns empty array when all homework is done', () => {
      const homework = [makeHomework({ is_done: true }), makeHomework({ is_done: true })];
      expect(service.getPendingHomework(homework)).toHaveLength(0);
    });
  });

  // ── countAbsencesByType ──────────────────────────────────

  describe('countAbsencesByType', () => {
    it('counts absences by type_short', () => {
      const records: SchoolAttendance[] = [
        makeAttendance({ type_short: 'nb' }),
        makeAttendance({ type_short: 'nb' }),
        makeAttendance({ type_short: 'sp' }),
        makeAttendance({ type_short: null, type: 'Spóźnienie' }),
      ];

      const result = service.countAbsencesByType(records);

      expect(result['nb']).toBe(2);
      expect(result['sp']).toBe(1);
      expect(result['Spóźnienie']).toBe(1);
    });

    it('returns empty object for empty input', () => {
      expect(service.countAbsencesByType([])).toEqual({});
    });
  });
});
