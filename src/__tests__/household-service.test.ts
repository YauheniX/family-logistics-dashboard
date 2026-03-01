import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HouseholdService } from '@/features/household/domain/household.service';

vi.mock('@/features/household/infrastructure/household.factory', () => ({
  householdRepository: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    createWithOwner: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  memberRepository: {
    findByHouseholdId: vi.fn(),
    inviteByEmail: vi.fn(),
    softDelete: vi.fn(),
  },
}));

const mockHousehold = {
  id: 'h1',
  name: 'Smith Family',
  slug: 'smith-family',
  created_by: 'u1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_active: true,
  settings: {},
};

const mockMember = {
  id: 'm1',
  household_id: 'h1',
  user_id: 'u1',
  role: 'owner' as const,
  display_name: 'John Smith',
  date_of_birth: null,
  avatar_url: null,
  is_active: true,
  joined_at: '2024-01-01T00:00:00Z',
  invited_by: null,
  metadata: {},
};

describe('HouseholdService', () => {
  let service: HouseholdService;

  beforeEach(() => {
    service = new HouseholdService();
    vi.clearAllMocks();
  });

  // ─── getUserHouseholds ──────────────────────────────────

  it('returns households for a user', async () => {
    const { householdRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(householdRepository.findByUserId).mockResolvedValue({
      data: [mockHousehold],
      error: null,
    });

    const result = await service.getUserHouseholds('u1');

    expect(householdRepository.findByUserId).toHaveBeenCalledWith('u1');
    expect(result.data).toEqual([mockHousehold]);
    expect(result.error).toBeNull();
  });

  it('handles getUserHouseholds error', async () => {
    const { householdRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(householdRepository.findByUserId).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const result = await service.getUserHouseholds('u1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Network error' });
  });

  // ─── getHousehold ───────────────────────────────────────

  it('returns a single household by id', async () => {
    const { householdRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(householdRepository.findById).mockResolvedValue({
      data: mockHousehold,
      error: null,
    });

    const result = await service.getHousehold('h1');

    expect(householdRepository.findById).toHaveBeenCalledWith('h1');
    expect(result.data).toEqual(mockHousehold);
    expect(result.error).toBeNull();
  });

  it('handles getHousehold error', async () => {
    const { householdRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(householdRepository.findById).mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const result = await service.getHousehold('h1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Not found' });
  });

  // ─── createHousehold ────────────────────────────────────

  it('creates a household successfully', async () => {
    const { householdRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(householdRepository.createWithOwner).mockResolvedValue({
      data: mockHousehold,
      error: null,
    });

    const result = await service.createHousehold('Smith Family', 'u1');

    expect(householdRepository.createWithOwner).toHaveBeenCalledWith('Smith Family', 'u1');
    expect(result.data).toEqual(mockHousehold);
    expect(result.error).toBeNull();
  });

  it('handles createHousehold error', async () => {
    const { householdRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(householdRepository.createWithOwner).mockResolvedValue({
      data: null,
      error: { message: 'Creation failed' },
    });

    const result = await service.createHousehold('Smith Family', 'u1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Creation failed' });
  });

  // ─── updateHousehold ────────────────────────────────────

  it('updates a household successfully', async () => {
    const { householdRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    const updated = { ...mockHousehold, name: 'Updated Family' };
    vi.mocked(householdRepository.update).mockResolvedValue({
      data: updated,
      error: null,
    });

    const result = await service.updateHousehold('h1', { name: 'Updated Family' });

    expect(householdRepository.update).toHaveBeenCalledWith('h1', { name: 'Updated Family' });
    expect(result.data).toEqual(updated);
    expect(result.error).toBeNull();
  });

  it('handles updateHousehold error', async () => {
    const { householdRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(householdRepository.update).mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    });

    const result = await service.updateHousehold('h1', { name: 'Updated Family' });

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Update failed' });
  });

  // ─── deleteHousehold ────────────────────────────────────

  it('deletes a household successfully', async () => {
    const { householdRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(householdRepository.delete).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const result = await service.deleteHousehold('h1');

    expect(householdRepository.delete).toHaveBeenCalledWith('h1');
    expect(result.error).toBeNull();
  });

  it('handles deleteHousehold error', async () => {
    const { householdRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(householdRepository.delete).mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    });

    const result = await service.deleteHousehold('h1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Delete failed' });
  });

  // ─── getMembers ─────────────────────────────────────────

  it('returns members for a household', async () => {
    const { memberRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(memberRepository.findByHouseholdId).mockResolvedValue({
      data: [mockMember],
      error: null,
    });

    const result = await service.getMembers('h1');

    expect(memberRepository.findByHouseholdId).toHaveBeenCalledWith('h1');
    expect(result.data).toEqual([mockMember]);
    expect(result.error).toBeNull();
  });

  it('handles getMembers error', async () => {
    const { memberRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(memberRepository.findByHouseholdId).mockResolvedValue({
      data: null,
      error: { message: 'Load failed' },
    });

    const result = await service.getMembers('h1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Load failed' });
  });

  // ─── inviteMemberByEmail ────────────────────────────────

  it('invites a member by email successfully', async () => {
    const { memberRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    const invitedMember = { ...mockMember, id: 'm2', user_id: 'u2', role: 'member' as const, display_name: 'Jane Doe', invited_by: 'u1' };
    vi.mocked(memberRepository.inviteByEmail).mockResolvedValue({
      data: invitedMember,
      error: null,
    });

    const result = await service.inviteMemberByEmail('h1', 'jane@example.com', 'u1');

    expect(memberRepository.inviteByEmail).toHaveBeenCalledWith('h1', 'jane@example.com', 'u1');
    expect(result.data).toEqual(invitedMember);
    expect(result.error).toBeNull();
  });

  it('handles inviteMemberByEmail error', async () => {
    const { memberRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(memberRepository.inviteByEmail).mockResolvedValue({
      data: null,
      error: { message: 'Invite failed' },
    });

    const result = await service.inviteMemberByEmail('h1', 'jane@example.com', 'u1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Invite failed' });
  });

  // ─── removeMember ───────────────────────────────────────

  it('removes a member successfully', async () => {
    const { memberRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(memberRepository.softDelete).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const result = await service.removeMember('m1');

    expect(memberRepository.softDelete).toHaveBeenCalledWith('m1');
    expect(result.error).toBeNull();
  });

  it('handles removeMember error', async () => {
    const { memberRepository } = await import(
      '@/features/household/infrastructure/household.factory'
    );
    vi.mocked(memberRepository.softDelete).mockResolvedValue({
      data: null,
      error: { message: 'Remove failed' },
    });

    const result = await service.removeMember('m1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Remove failed' });
  });
});
