import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  HouseholdRepository,
  MemberRepository,
} from '@/features/household/infrastructure/household.repository';
import type { Household, Member } from '@/features/shared/domain/entities';

const buildHousehold = (overrides: Partial<Household> = {}): Household => ({
  id: 'household-1',
  name: 'Home',
  slug: 'home',
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  is_active: true,
  settings: {},
  ...overrides,
});

const buildMember = (overrides: Partial<Member> = {}): Member => ({
  id: 'member-1',
  household_id: 'household-1',
  user_id: 'user-1',
  role: 'member',
  display_name: 'User',
  date_of_birth: null,
  avatar_url: null,
  is_active: true,
  joined_at: '2024-01-01T00:00:00.000Z',
  invited_by: null,
  metadata: {},
  ...overrides,
});

type ExecuteResponse = { data: unknown | null; error: { message: string } | null };

const mockExecute = (repo: unknown) =>
  vi.spyOn(repo as { execute: (...args: unknown[]) => Promise<unknown> }, 'execute');

describe('HouseholdRepository', () => {
  let repository: HouseholdRepository;

  beforeEach(() => {
    vi.restoreAllMocks();
    repository = new HouseholdRepository();
  });

  describe('findByUserId', () => {
    it('returns the error from the base query', async () => {
      const findAllSpy = vi
        .spyOn(repository, 'findAll')
        .mockResolvedValue({ data: null, error: { message: 'Query failed' } });

      const result = await repository.findByUserId('user-1');

      expect(result.error?.message).toBe('Query failed');
      expect(findAllSpy).toHaveBeenCalledTimes(1);
    });

    it('returns owned households when memberships fail', async () => {
      const ownHousehold = buildHousehold({ id: 'household-own' });
      const findAllSpy = vi
        .spyOn(repository, 'findAll')
        .mockResolvedValueOnce({ data: [ownHousehold], error: null });
      const executeSpy = mockExecute(repository).mockResolvedValue({
        data: null,
        error: { message: 'Memberships failed' },
      } satisfies ExecuteResponse);

      const result = await repository.findByUserId('user-1');

      expect(result.data).toEqual([ownHousehold]);
      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(findAllSpy).toHaveBeenCalledTimes(1);
    });

    it('skips member lookup when memberships only include owned households', async () => {
      const ownHousehold = buildHousehold({ id: 'household-own' });
      const findAllSpy = vi
        .spyOn(repository, 'findAll')
        .mockResolvedValueOnce({ data: [ownHousehold], error: null });
      const executeSpy = mockExecute(repository).mockResolvedValue({
        data: [{ household_id: ownHousehold.id }],
        error: null,
      } satisfies ExecuteResponse);

      const result = await repository.findByUserId('user-1');

      expect(result.data).toEqual([ownHousehold]);
      expect(findAllSpy).toHaveBeenCalledTimes(1);
      expect(executeSpy).toHaveBeenCalledTimes(1);
    });

    it('combines owned and member households', async () => {
      const ownHousehold = buildHousehold({ id: 'household-own' });
      const memberHousehold = buildHousehold({
        id: 'household-member',
        created_by: 'user-2',
      });

      const findAllSpy = vi
        .spyOn(repository, 'findAll')
        .mockResolvedValueOnce({ data: [ownHousehold], error: null })
        .mockResolvedValueOnce({ data: [memberHousehold], error: null });

      mockExecute(repository).mockResolvedValue({
        data: [{ household_id: memberHousehold.id }],
        error: null,
      } satisfies ExecuteResponse);

      const result = await repository.findByUserId('user-1');
      const resultIds = (result.data ?? []).map((item) => item.id).sort();

      expect(resultIds).toEqual([ownHousehold.id, memberHousehold.id].sort());
      expect(findAllSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('createWithOwner', () => {
    it('returns error when the RPC fails', async () => {
      mockExecute(repository).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      } satisfies ExecuteResponse);

      const result = await repository.createWithOwner('Home', 'user-1');

      expect(result.error?.message).toBe('RPC failed');
    });

    it('returns error when RPC returns no data', async () => {
      mockExecute(repository).mockResolvedValue({
        data: null,
        error: null,
      } satisfies ExecuteResponse);

      const result = await repository.createWithOwner('Home', 'user-1');

      expect(result.error?.message).toContain('RPC returned no data');
    });

    it('fetches the household after creation', async () => {
      mockExecute(repository).mockResolvedValue({
        data: {
          household_id: 'household-1',
          member_id: 'member-1',
          household_name: 'Home',
          slug: 'home',
        },
        error: null,
      } satisfies ExecuteResponse);

      const findByIdSpy = vi
        .spyOn(repository, 'findById')
        .mockResolvedValue({ data: buildHousehold({ id: 'household-1' }), error: null });

      const result = await repository.createWithOwner('Home', 'user-1');

      expect(findByIdSpy).toHaveBeenCalledWith('household-1');
      expect(result.data?.id).toBe('household-1');
    });
  });
});

describe('MemberRepository', () => {
  let repository: MemberRepository;

  beforeEach(() => {
    vi.restoreAllMocks();
    repository = new MemberRepository();
  });

  describe('findByHouseholdId', () => {
    it('returns errors from getMembersWithProfiles', async () => {
      vi.spyOn(repository, 'getMembersWithProfiles').mockResolvedValue({
        data: null,
        error: { message: 'Fetch failed' },
      });

      const result = await repository.findByHouseholdId('household-1');

      expect(result.error?.message).toBe('Fetch failed');
    });

    it('adds email addresses to members with user IDs', async () => {
      const members = [
        buildMember({ id: 'member-1', user_id: 'user-1' }),
        buildMember({ id: 'member-2', user_id: null }),
      ];

      vi.spyOn(repository, 'getMembersWithProfiles').mockResolvedValue({
        data: members,
        error: null,
      });

      const executeSpy = mockExecute(repository).mockResolvedValue({
        data: 'user1@example.com',
        error: null,
      } satisfies ExecuteResponse);

      const result = await repository.findByHouseholdId('household-1');

      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(result.data?.[0].email).toBe('user1@example.com');
      expect(result.data?.[1].email).toBeUndefined();
    });
  });

  describe('getMembersWithProfiles', () => {
    it('returns errors from the base query', async () => {
      vi.spyOn(repository, 'findAll').mockResolvedValue({
        data: null,
        error: { message: 'Lookup failed' },
      });

      const result = await repository.getMembersWithProfiles('household-1');

      expect(result.error?.message).toBe('Lookup failed');
    });

    it('returns members when no profiles are needed', async () => {
      const members = [buildMember({ user_id: null })];
      const findAllSpy = vi
        .spyOn(repository, 'findAll')
        .mockResolvedValue({ data: members, error: null });
      const executeSpy = mockExecute(repository);

      const result = await repository.getMembersWithProfiles('household-1');

      expect(result.data).toEqual(members);
      expect(findAllSpy).toHaveBeenCalledTimes(1);
      expect(executeSpy).not.toHaveBeenCalled();
    });

    it('merges user profile data into members', async () => {
      const members = [
        buildMember({ id: 'member-1', user_id: 'user-1' }),
        buildMember({ id: 'member-2', user_id: 'user-2' }),
      ];

      vi.spyOn(repository, 'findAll').mockResolvedValue({ data: members, error: null });

      mockExecute(repository).mockResolvedValue({
        data: [{ id: 'user-1', display_name: 'Primary', avatar_url: 'avatar.png' }],
        error: null,
      } satisfies ExecuteResponse);

      const result = await repository.getMembersWithProfiles('household-1');

      expect(result.data?.[0].user_profiles?.display_name).toBe('Primary');
      expect(result.data?.[1].user_profiles).toBeUndefined();
    });
  });

  describe('inviteByEmail', () => {
    it('returns a friendly auth error when lookup fails with auth required', async () => {
      mockExecute(repository).mockResolvedValue({
        data: null,
        error: { message: 'Authentication required' },
      } satisfies ExecuteResponse);

      const result = await repository.inviteByEmail('household-1', 'test@example.com');

      expect(result.error?.message).toBe('Authentication required. Please sign in again.');
    });

    it('returns a not-found error when no user exists', async () => {
      mockExecute(repository).mockResolvedValue({
        data: null,
        error: null,
      } satisfies ExecuteResponse);

      const result = await repository.inviteByEmail('household-1', 'test@example.com');

      expect(result.error?.message).toBe('User not found with that email');
    });

    it('prevents inviting the current user', async () => {
      mockExecute(repository).mockResolvedValue({
        data: 'user-1',
        error: null,
      } satisfies ExecuteResponse);

      const result = await repository.inviteByEmail('household-1', 'test@example.com', 'user-1');

      expect(result.error?.message).toBe('Cannot add yourself as a member');
    });

    it('creates a member record when the user exists', async () => {
      mockExecute(repository).mockResolvedValue({
        data: 'user-2',
        error: null,
      } satisfies ExecuteResponse);

      const createSpy = vi.spyOn(repository, 'create').mockResolvedValue({
        data: buildMember({ id: 'member-2', user_id: 'user-2' }),
        error: null,
      });

      const result = await repository.inviteByEmail('household-1', 'test@example.com');

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(result.data?.email).toBe('test@example.com');
      expect(result.error).toBeNull();
    });
  });
});
