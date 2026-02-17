import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useHouseholdEntityStore } from '@/features/household/presentation/household.store';

vi.mock('@/features/household/domain/household.service', () => ({
  householdService: {
    getUserHouseholds: vi.fn(),
    getHousehold: vi.fn(),
    createHousehold: vi.fn(),
    updateHousehold: vi.fn(),
    deleteHousehold: vi.fn(),
    getMembers: vi.fn(),
    inviteMemberByEmail: vi.fn(),
    removeMember: vi.fn(),
  },
}));

const mockHousehold = {
  id: 'f1',
  name: 'Test Family',
  created_by: 'u1',
  created_at: '2024-01-01T00:00:00Z',
};

const mockMember = {
  id: 'm1',
  household_id: 'f1',
  user_id: 'u2',
  role: 'member' as const,
  joined_at: '2024-01-01T00:00:00Z',
  email: 'member@test.com',
};

describe('Household Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with default state', () => {
    const store = useHouseholdEntityStore();
    expect(store.households).toEqual([]);
    expect(store.currentHousehold).toBeNull();
    expect(store.members).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.householdCount).toBe(0);
    expect(store.memberCount).toBe(0);
  });

  // ─── loadHouseholds ─────────────────────────────────────────

  it('loads households successfully', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.getUserHouseholds).mockResolvedValue({
      data: [mockHousehold],
      error: null,
    });

    const store = useHouseholdEntityStore();
    await store.loadHouseholds('u1');

    expect(store.households).toEqual([mockHousehold]);
    expect(store.householdCount).toBe(1);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('handles loadHouseholds error', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.getUserHouseholds).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const store = useHouseholdEntityStore();
    await store.loadHouseholds('u1');

    expect(store.households).toEqual([]);
    expect(store.error).toBe('Network error');
    expect(store.loading).toBe(false);
  });

  // ─── createHousehold ─────────────────────────────────────────

  it('creates a family successfully', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.createHousehold).mockResolvedValue({
      data: mockHousehold,
      error: null,
    });

    const store = useHouseholdEntityStore();
    const result = await store.createHousehold('Test Family', 'u1');

    expect(result).toEqual(mockHousehold);
    expect(store.households).toContainEqual(mockHousehold);
    expect(store.loading).toBe(false);
  });

  it('handles createHousehold error', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.createHousehold).mockResolvedValue({
      data: null,
      error: { message: 'Creation failed' },
    });

    const store = useHouseholdEntityStore();
    const result = await store.createHousehold('Test Family', 'u1');

    expect(result).toBeNull();
    expect(store.households).toEqual([]);
  });

  // ─── loadHousehold ────────────────────────────────────────────

  it('loads a single family successfully', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.getHousehold).mockResolvedValue({
      data: mockHousehold,
      error: null,
    });
    vi.mocked(householdService.getMembers).mockResolvedValue({
      data: [mockMember],
      error: null,
    });

    const store = useHouseholdEntityStore();
    await store.loadHousehold('f1');

    expect(store.currentHousehold).toEqual(mockHousehold);
    expect(store.members).toEqual([mockMember]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('handles loadHousehold error', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.getHousehold).mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const store = useHouseholdEntityStore();
    await store.loadHousehold('f1');

    expect(store.currentHousehold).toBeNull();
    expect(store.error).toBe('Not found');
    expect(store.loading).toBe(false);
  });

  // ─── updateHousehold ────────────────────────────────────────

  it('updates a family successfully', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    const updated = { ...mockHousehold, name: 'Updated Family' };
    vi.mocked(householdService.updateHousehold).mockResolvedValue({
      data: updated,
      error: null,
    });

    const store = useHouseholdEntityStore();
    store.households = [mockHousehold];
    const result = await store.updateHousehold('f1', { name: 'Updated Family' });

    expect(result).toEqual(updated);
    expect(store.households[0].name).toBe('Updated Family');
    expect(store.currentHousehold).toEqual(updated);
    expect(store.loading).toBe(false);
  });

  it('handles updateHousehold error', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.updateHousehold).mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    });

    const store = useHouseholdEntityStore();
    store.households = [mockHousehold];
    const result = await store.updateHousehold('f1', { name: 'Updated Family' });

    expect(result).toBeNull();
    expect(store.households[0].name).toBe('Test Family');
  });

  // ─── removeHousehold ────────────────────────────────────────

  it('removes a family successfully', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.deleteHousehold).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const store = useHouseholdEntityStore();
    store.households = [mockHousehold];
    await store.removeHousehold('f1');

    expect(store.households).toEqual([]);
    expect(store.loading).toBe(false);
  });

  it('handles removeHousehold error', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.deleteHousehold).mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    });

    const store = useHouseholdEntityStore();
    store.households = [mockHousehold];
    await store.removeHousehold('f1');

    expect(store.households).toContainEqual(mockHousehold);
  });

  // ─── loadMembers ──────────────────────────────────────────

  it('loads family members successfully', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.getMembers).mockResolvedValue({
      data: [mockMember],
      error: null,
    });

    const store = useHouseholdEntityStore();
    await store.loadMembers('f1');

    expect(store.members).toEqual([mockMember]);
    expect(store.memberCount).toBe(1);
  });

  it('handles loadMembers error', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.getMembers).mockResolvedValue({
      data: null,
      error: { message: 'Load failed' },
    });

    const store = useHouseholdEntityStore();
    await store.loadMembers('f1');

    expect(store.members).toEqual([]);
  });

  // ─── inviteMember ─────────────────────────────────────────

  it('invites a member successfully', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.inviteMemberByEmail).mockResolvedValue({
      data: mockMember,
      error: null,
    });

    const store = useHouseholdEntityStore();
    const result = await store.inviteMember('f1', 'member@test.com', 'u1');

    expect(result).toEqual(mockMember);
    expect(store.members).toContainEqual(mockMember);
  });

  it('handles inviteMember error', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.inviteMemberByEmail).mockResolvedValue({
      data: null,
      error: { message: 'Invite failed' },
    });

    const store = useHouseholdEntityStore();
    const result = await store.inviteMember('f1', 'bad@test.com');

    expect(result).toBeNull();
    expect(store.members).toEqual([]);
  });

  // ─── removeMember ─────────────────────────────────────────

  it('removes a member successfully', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.removeMember).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const store = useHouseholdEntityStore();
    store.members = [mockMember];
    await store.removeMember('m1');

    expect(store.members).toEqual([]);
  });

  it('handles removeMember error', async () => {
    const { householdService } = await import('@/features/household/domain/household.service');
    vi.mocked(householdService.removeMember).mockResolvedValue({
      data: null,
      error: { message: 'Remove failed' },
    });

    const store = useHouseholdEntityStore();
    store.members = [mockMember];
    await store.removeMember('m1');

    expect(store.members).toContainEqual(mockMember);
  });
});
