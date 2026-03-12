import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSchoolStore } from '@/features/school/presentation/school.store';
import type { SchoolPlatform } from '@/features/school/domain/school.entities';

// ─── Mocks ────────────────────────────────────────────────

vi.mock('@/features/school/domain/school.service', () => ({
  schoolService: {
    getConnections: vi.fn(),
    connectSchool: vi.fn(),
    disconnectSchool: vi.fn(),
    sync: vi.fn(),
    getGrades: vi.fn(),
    getWeekTimetable: vi.fn(),
    getHomework: vi.fn(),
    getAttendance: vi.fn(),
    getMessages: vi.fn(),
    getAnnouncements: vi.fn(),
    markHomeworkDone: vi.fn(),
    groupGradesBySubject: vi.fn((grades) => {
      const result: Record<string, unknown[]> = {};
      for (const g of grades) {
        const key = g.subject || 'Other';
        if (!result[key]) result[key] = [];
        result[key].push(g);
      }
      return result;
    }),
    groupLessonsByDate: vi.fn((lessons) => {
      const result: Record<string, unknown[]> = {};
      for (const l of lessons) {
        if (!result[l.date]) result[l.date] = [];
        result[l.date].push(l);
      }
      return result;
    }),
    getPendingHomework: vi.fn((hw) => hw.filter((h: { is_done: boolean }) => !h.is_done)),
  },
}));

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────

function makeConnection(overrides = {}) {
  return {
    id: 'conn-1',
    household_id: 'h1',
    member_id: 'm1',
    platform: 'librus' as SchoolPlatform,
    display_label: 'Jan Kowalski – 5B',
    student_name: 'Jan Kowalski',
    class_name: '5B',
    school_name: 'SP1',
    is_active: true,
    last_synced_at: null,
    sync_error: null,
    token_expiry: null,
    created_at: '2025-09-01T00:00:00Z',
    updated_at: '2025-09-01T00:00:00Z',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────

describe('useSchoolStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initialises with empty state', () => {
    const store = useSchoolStore();
    expect(store.connections).toEqual([]);
    expect(store.activeConnectionId).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.syncing).toBe(false);
    expect(store.connecting).toBe(false);
    expect(store.error).toBeNull();
  });

  it('$reset restores initial state', () => {
    const store = useSchoolStore();
    store.connections.push(makeConnection() as never);
    store.activeConnectionId = 'conn-1';
    store.error = 'something went wrong';

    store.$reset();

    expect(store.connections).toEqual([]);
    expect(store.activeConnectionId).toBeNull();
    expect(store.error).toBeNull();
  });

  it('setActiveConnection updates activeConnectionId', () => {
    const store = useSchoolStore();
    store.setActiveConnection('conn-abc');
    expect(store.activeConnectionId).toBe('conn-abc');
    store.setActiveConnection(null);
    expect(store.activeConnectionId).toBeNull();
  });

  it('loadConnections sets connections and auto-selects first', async () => {
    const { schoolService } = await import('@/features/school/domain/school.service');
    vi.mocked(schoolService.getConnections).mockResolvedValue({
      data: [makeConnection({ id: 'c1' }), makeConnection({ id: 'c2' })],
      error: null,
    });

    const store = useSchoolStore();
    await store.loadConnections('h1');

    expect(store.connections).toHaveLength(2);
    expect(store.activeConnectionId).toBe('c1');
    expect(store.loading).toBe(false);
  });

  it('loadConnections sets error on failure', async () => {
    const { schoolService } = await import('@/features/school/domain/school.service');
    vi.mocked(schoolService.getConnections).mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });

    const store = useSchoolStore();
    await store.loadConnections('h1');

    expect(store.error).toBe('DB error');
    expect(store.connections).toEqual([]);
  });

  it('connectSchool calls service and reloads connections on success', async () => {
    const { schoolService } = await import('@/features/school/domain/school.service');
    vi.mocked(schoolService.connectSchool).mockResolvedValue({
      data: {
        ok: true,
        connection: makeConnection({ id: 'new-conn' }) as never,
      },
      error: null,
    });
    vi.mocked(schoolService.getConnections).mockResolvedValue({
      data: [makeConnection({ id: 'new-conn' })],
      error: null,
    });

    const store = useSchoolStore();
    const result = await store.connectSchool({
      household_id: 'h1',
      member_id: 'm1',
      username: 'user',
      password: 'pass',
    });

    expect(result).toBe(true);
    expect(store.connections).toHaveLength(1);
  });

  it('connectSchool returns false on error', async () => {
    const { schoolService } = await import('@/features/school/domain/school.service');
    vi.mocked(schoolService.connectSchool).mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    });

    const store = useSchoolStore();
    const result = await store.connectSchool({
      household_id: 'h1',
      member_id: 'm1',
      username: 'user',
      password: 'wrong',
    });

    expect(result).toBe(false);
    expect(store.error).toBe('Invalid credentials');
  });

  it('disconnectSchool removes connection from list', async () => {
    const { schoolService } = await import('@/features/school/domain/school.service');
    vi.mocked(schoolService.disconnectSchool).mockResolvedValue({
      data: { ok: true },
      error: null,
    });

    const store = useSchoolStore();
    store.connections.push(makeConnection({ id: 'c1' }) as never);
    store.connections.push(makeConnection({ id: 'c2' }) as never);
    store.activeConnectionId = 'c1';

    const result = await store.disconnectSchool('c1', 'h1');

    expect(result).toBe(true);
    expect(store.connections).toHaveLength(1);
    expect(store.connections[0].id).toBe('c2');
    // Auto-selects next connection
    expect(store.activeConnectionId).toBe('c2');
  });

  it('computed activeConnection returns the active connection', () => {
    const store = useSchoolStore();
    store.connections.push(makeConnection({ id: 'c1' }) as never);
    store.connections.push(makeConnection({ id: 'c2' }) as never);
    store.activeConnectionId = 'c2';

    expect(store.activeConnection?.id).toBe('c2');
  });

  it('computed activeConnection returns null when no id selected', () => {
    const store = useSchoolStore();
    store.connections.push(makeConnection({ id: 'c1' }) as never);
    store.activeConnectionId = null;

    expect(store.activeConnection).toBeNull();
  });

  it('toggleHomeworkDone updates homework in store', async () => {
    const { schoolService } = await import('@/features/school/domain/school.service');
    const updated = {
      id: 'hw1',
      connection_id: 'c1',
      subject: 'Math',
      description: 'Test',
      date_due: '2025-10-01',
      teacher: null,
      is_new: false,
      is_done: true,
      external_id: null,
      created_at: '2025-09-01T00:00:00Z',
    };
    vi.mocked(schoolService.markHomeworkDone).mockResolvedValue({ data: updated, error: null });

    const store = useSchoolStore();
    store.homework['c1'] = [{ ...updated, is_done: false }] as never;
    store.activeConnectionId = 'c1';

    await store.toggleHomeworkDone('hw1', 'c1', true);

    expect(store.homework['c1'][0].is_done).toBe(true);
  });
});
