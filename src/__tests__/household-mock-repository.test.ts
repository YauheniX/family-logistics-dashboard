import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ApiResponse } from '@/features/shared/domain/repository.interface';
import type { Member } from '@/features/shared/domain/entities';
import {
  MockHouseholdRepository,
  MockMemberRepository,
} from '@/features/household/infrastructure/household.mock-repository';

vi.mock('@/features/shared/infrastructure/mock-storage.adapter', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/shared/infrastructure/mock-storage.adapter')
  >('@/features/shared/infrastructure/mock-storage.adapter');
  return {
    ...actual,
    createStorageAdapter: () => new actual.InMemoryAdapter(),
  };
});

const buildMemberDto = (overrides: Partial<Member> = {}) => ({
  household_id: 'household-1',
  user_id: 'user-1',
  role: 'member',
  display_name: 'User',
  date_of_birth: null,
  avatar_url: null,
  is_active: true,
  ...overrides,
});

describe('MockHouseholdRepository', () => {
  let memberRepository: MockMemberRepository;
  let repository: MockHouseholdRepository;

  beforeEach(() => {
    memberRepository = new MockMemberRepository();
    repository = new MockHouseholdRepository(memberRepository);
  });

  it('returns owned and member households for a user', async () => {
    const ownResult = await repository.create({
      name: 'Home',
      created_by: 'user-1',
    } as unknown as { name: string; created_by: string });

    const otherResult = await repository.create({
      name: 'Other',
      created_by: 'user-2',
    } as unknown as { name: string; created_by: string });

    await (
      repository as unknown as { storage: { set: (key: string, value: unknown) => Promise<void> } }
    ).storage.set('table:mock_household_members', [
      { household_id: otherResult.data?.id, user_id: 'user-1' },
    ]);

    const result = await repository.findByUserId('user-1');
    const resultIds = (result.data ?? []).map((item) => item.id).sort();

    expect(resultIds).toEqual([ownResult.data?.id, otherResult.data?.id].sort());
  });

  it('handles storage errors when loading households', async () => {
    const storage = (
      repository as unknown as { storage: { get: (key: string) => Promise<unknown> } }
    ).storage;
    vi.spyOn(storage, 'get').mockRejectedValueOnce(new Error('Storage failed'));

    const result = await repository.findByUserId('user-1');

    expect(result.error?.message).toBe('Storage failed');
  });

  it('creates a household and owner member together', async () => {
    const result = await repository.createWithOwner('Home', 'user-1', 'Owner');
    const members = await memberRepository.findAll();

    expect(result.data?.name).toBe('Home');
    expect(members.data?.[0].role).toBe('owner');
  });

  it('rolls back the household when member creation fails', async () => {
    class FailingMemberRepository extends MockMemberRepository {
      async create(_dto: unknown): Promise<ApiResponse<Member>> {
        return { data: null, error: { message: 'Member create failed' } };
      }
    }

    repository = new MockHouseholdRepository(new FailingMemberRepository());

    const result = await repository.createWithOwner('Home', 'user-1');
    const households = await repository.findAll();

    expect(result.error?.message).toBe('Member create failed');
    expect(households.data).toEqual([]);
  });
});

describe('MockMemberRepository', () => {
  let repository: MockMemberRepository;

  beforeEach(() => {
    repository = new MockMemberRepository();
  });

  it('filters members by household', async () => {
    await repository.create(buildMemberDto({ household_id: 'household-1' }) as unknown as Member);
    await repository.create(buildMemberDto({ household_id: 'household-2' }) as unknown as Member);

    const result = await repository.findByHouseholdId('household-1');

    expect(result.data?.length).toBe(1);
    expect(result.data?.[0].household_id).toBe('household-1');
  });

  it('includes mock profiles when user IDs exist', async () => {
    await repository.create(buildMemberDto({ user_id: 'user-1' }) as unknown as Member);
    await repository.create(buildMemberDto({ user_id: null }) as unknown as Member);

    const result = await repository.getMembersWithProfiles('household-1');

    expect(result.data?.[0].user_profiles).toEqual({ display_name: null, avatar_url: null });
    expect(result.data?.[1].user_profiles).toBeUndefined();
  });

  it('creates child members via the mock RPC', async () => {
    const result = await repository.createChild('household-1', 'Kid', '2010-01-01', null);
    const created = await repository.findById(result.data ?? '');

    expect(result.data).toBeTruthy();
    expect(created.data?.role).toBe('child');
    expect(created.data?.user_id).toBeNull();
  });

  it('creates and fetches invitations', async () => {
    const inviteId = await repository.sendInvitation('household-1', 'test@example.com', 'member');
    const fetched = await repository.getInvitationById(inviteId.data ?? '');

    expect(fetched.data?.email).toBe('test@example.com');
  });

  it('returns not found for missing invitations', async () => {
    const result = await repository.getInvitationById('missing');

    expect(result.error?.message).toBe('Invitation not found');
  });

  it('soft deletes members by setting is_active to false', async () => {
    const created = await repository.create(buildMemberDto() as unknown as Member);

    await repository.softDelete(created.data?.id ?? '');
    const updated = await repository.findById(created.data?.id ?? '');

    expect(updated.data?.is_active).toBe(false);
  });

  it('prevents inviting the current user', async () => {
    const result = await repository.inviteByEmail(
      'household-1',
      'test@example.com',
      'user-test-example-com',
    );

    expect(result.error?.message).toBe('Cannot add yourself as a member');
  });

  it('invites members by email', async () => {
    const result = await repository.inviteByEmail('household-1', 'test@example.com');

    expect(result.data?.email).toBe('test@example.com');
    expect(result.data?.role).toBe('member');
  });
});
