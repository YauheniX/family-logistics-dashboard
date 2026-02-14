import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFamilyStore } from '@/features/family/presentation/family.store';

vi.mock('@/features/family/domain/family.service', () => ({
  familyService: {
    getUserFamilies: vi.fn(),
    getFamily: vi.fn(),
    createFamily: vi.fn(),
    updateFamily: vi.fn(),
    deleteFamily: vi.fn(),
    getFamilyMembers: vi.fn(),
    inviteMemberByEmail: vi.fn(),
    removeMember: vi.fn(),
  },
}));

const mockFamily = {
  id: 'f1',
  name: 'Test Family',
  created_by: 'u1',
  created_at: '2024-01-01T00:00:00Z',
};

const mockMember = {
  id: 'm1',
  family_id: 'f1',
  user_id: 'u2',
  role: 'member' as const,
  joined_at: '2024-01-01T00:00:00Z',
  email: 'member@test.com',
};

describe('Family Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with default state', () => {
    const store = useFamilyStore();
    expect(store.families).toEqual([]);
    expect(store.currentFamily).toBeNull();
    expect(store.members).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.familyCount).toBe(0);
    expect(store.memberCount).toBe(0);
  });

  // ─── loadFamilies ─────────────────────────────────────────

  it('loads families successfully', async () => {
    const { familyService } = await import('@/features/family/domain/family.service');
    vi.mocked(familyService.getUserFamilies).mockResolvedValue({
      data: [mockFamily],
      error: null,
    });

    const store = useFamilyStore();
    await store.loadFamilies('u1');

    expect(store.families).toEqual([mockFamily]);
    expect(store.familyCount).toBe(1);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('handles loadFamilies error', async () => {
    const { familyService } = await import('@/features/family/domain/family.service');
    vi.mocked(familyService.getUserFamilies).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const store = useFamilyStore();
    await store.loadFamilies('u1');

    expect(store.families).toEqual([]);
    expect(store.error).toBe('Network error');
    expect(store.loading).toBe(false);
  });

  // ─── createFamily ─────────────────────────────────────────

  it('creates a family successfully', async () => {
    const { familyService } = await import('@/features/family/domain/family.service');
    vi.mocked(familyService.createFamily).mockResolvedValue({
      data: mockFamily,
      error: null,
    });

    const store = useFamilyStore();
    const result = await store.createFamily('Test Family', 'u1');

    expect(result).toEqual(mockFamily);
    expect(store.families).toContainEqual(mockFamily);
    expect(store.loading).toBe(false);
  });

  it('handles createFamily error', async () => {
    const { familyService } = await import('@/features/family/domain/family.service');
    vi.mocked(familyService.createFamily).mockResolvedValue({
      data: null,
      error: { message: 'Creation failed' },
    });

    const store = useFamilyStore();
    const result = await store.createFamily('Test Family', 'u1');

    expect(result).toBeNull();
    expect(store.families).toEqual([]);
  });

  // ─── loadMembers ──────────────────────────────────────────

  it('loads family members successfully', async () => {
    const { familyService } = await import('@/features/family/domain/family.service');
    vi.mocked(familyService.getFamilyMembers).mockResolvedValue({
      data: [mockMember],
      error: null,
    });

    const store = useFamilyStore();
    await store.loadMembers('f1');

    expect(store.members).toEqual([mockMember]);
    expect(store.memberCount).toBe(1);
  });

  it('handles loadMembers error', async () => {
    const { familyService } = await import('@/features/family/domain/family.service');
    vi.mocked(familyService.getFamilyMembers).mockResolvedValue({
      data: null,
      error: { message: 'Load failed' },
    });

    const store = useFamilyStore();
    await store.loadMembers('f1');

    expect(store.members).toEqual([]);
  });

  // ─── inviteMember ─────────────────────────────────────────

  it('invites a member successfully', async () => {
    const { familyService } = await import('@/features/family/domain/family.service');
    vi.mocked(familyService.inviteMemberByEmail).mockResolvedValue({
      data: mockMember,
      error: null,
    });

    const store = useFamilyStore();
    const result = await store.inviteMember('f1', 'member@test.com', 'u1');

    expect(result).toEqual(mockMember);
    expect(store.members).toContainEqual(mockMember);
  });

  it('handles inviteMember error', async () => {
    const { familyService } = await import('@/features/family/domain/family.service');
    vi.mocked(familyService.inviteMemberByEmail).mockResolvedValue({
      data: null,
      error: { message: 'Invite failed' },
    });

    const store = useFamilyStore();
    const result = await store.inviteMember('f1', 'bad@test.com');

    expect(result).toBeNull();
    expect(store.members).toEqual([]);
  });

  // ─── removeMember ─────────────────────────────────────────

  it('removes a member successfully', async () => {
    const { familyService } = await import('@/features/family/domain/family.service');
    vi.mocked(familyService.removeMember).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const store = useFamilyStore();
    store.members = [mockMember];
    await store.removeMember('m1');

    expect(store.members).toEqual([]);
  });

  it('handles removeMember error', async () => {
    const { familyService } = await import('@/features/family/domain/family.service');
    vi.mocked(familyService.removeMember).mockResolvedValue({
      data: null,
      error: { message: 'Remove failed' },
    });

    const store = useFamilyStore();
    store.members = [mockMember];
    await store.removeMember('m1');

    expect(store.members).toContainEqual(mockMember);
  });
});
