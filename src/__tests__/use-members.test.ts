import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMembers } from '@/composables/useMembers';
import { useHouseholdStore } from '@/stores/household';
import { useToastStore } from '@/stores/toast';

// Mock the factory to return real repositories (not mocks) so we can test with mocked Supabase
vi.mock('@/features/household/infrastructure/household.factory', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/household/infrastructure/household.factory')
  >('@/features/household/infrastructure/household.factory');
  const { MemberRepository } =
    await import('@/features/household/infrastructure/household.repository');
  return {
    ...actual,
    memberRepository: new MemberRepository(),
  };
});

// Mock the Supabase client
vi.mock('@/features/shared/infrastructure/supabase.client', () => {
  // Chainable query builder - fresh instance per from() call
  const createChainableBuilder = () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'm-2',
          household_id: 'hh-1',
          user_id: 'user-2',
          role: 'member',
          display_name: 'Test Member',
          is_active: false,
          joined_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      }),
      update: vi.fn().mockReturnThis(), // Returns this so .eq() can be chained
      delete: vi.fn().mockReturnThis(),
    };
    return builder;
  };

  let lastFromBuilder: ReturnType<typeof createChainableBuilder> | null = null;
  const fromFn = vi.fn(() => {
    const builder = createChainableBuilder();
    lastFromBuilder = builder;
    return builder;
  });
  const mockRpc = vi.fn();

  return {
    supabase: {
      from: fromFn,
      rpc: mockRpc,
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      },
      get __fromBuilder() {
        return lastFromBuilder;
      },
      __mockRpc: mockRpc,
    },
  };
});

// Helper to get mocked supabase
async function getMockedSupabase() {
  const mod = await import('@/features/shared/infrastructure/supabase.client');
  return mod.supabase as typeof mod.supabase & {
    __fromBuilder: Record<string, ReturnType<typeof vi.fn>>;
    __mockRpc: ReturnType<typeof vi.fn>;
  };
}

describe('useMembers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('fetchMembers', () => {
    it('should not fetch when no household is selected', async () => {
      const { fetchMembers, members } = useMembers();

      await fetchMembers();

      expect(members.value).toEqual([]);
    });

    it('should fetch members for the current household', async () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test House',
        slug: 'test-house',
        role: 'owner',
      });

      const supabase = await getMockedSupabase();
      const mockMembers = [
        {
          id: 'm-1',
          household_id: 'hh-1',
          user_id: 'u-1',
          role: 'owner',
          display_name: 'Owner',
          is_active: true,
        },
        {
          id: 'm-2',
          household_id: 'hh-1',
          user_id: null,
          role: 'child',
          display_name: 'Kid',
          is_active: true,
        },
      ];

      supabase.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
      }));

      const { fetchMembers, members, loading, error } = useMembers();

      await fetchMembers();

      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(members.value).toEqual(mockMembers);
    });

    it('should handle fetch errors', async () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test House',
        slug: 'test-house',
        role: 'owner',
      });

      const supabase = await getMockedSupabase();
      supabase.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied', code: '42501', details: null },
        }),
      }));

      const { fetchMembers, error } = useMembers();
      const toastStore = useToastStore();

      await fetchMembers();

      expect(error.value).not.toBeNull();
      expect(error.value!.message).toBe('Permission denied');
      expect(toastStore.toasts.length).toBeGreaterThan(0);
    });
  });

  describe('createChild', () => {
    it('should fail when no household is selected', async () => {
      const householdStore = useHouseholdStore();
      // Clear any household that may have been restored from localStorage
      householdStore.setCurrentHousehold(null);

      const { createChild } = useMembers();
      const toastStore = useToastStore();

      const result = await createChild({
        name: 'Child',
        birthday: '2020-01-01',
        avatar: '👶',
      });

      expect(result).toBeNull();
      expect(toastStore.toasts.some((t) => t.message.includes('No household'))).toBe(true);
    });

    it('should fail when user is not owner or admin', async () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test House',
        slug: 'test-house',
        role: 'member', // Not admin
      });

      const { createChild } = useMembers();
      const toastStore = useToastStore();

      const result = await createChild({
        name: 'Child',
        birthday: '2020-01-01',
        avatar: '👶',
      });

      expect(result).toBeNull();
      expect(toastStore.toasts.some((t) => t.message.includes('Only owners and admins'))).toBe(
        true,
      );
    });

    it('should create a child member successfully', async () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test House',
        slug: 'test-house',
        role: 'owner',
      });

      const supabase = await getMockedSupabase();
      const newMemberId = 'new-child-id';
      const newMemberData = {
        id: newMemberId,
        household_id: 'hh-1',
        user_id: null,
        role: 'child',
        display_name: 'Emma',
        date_of_birth: '2020-01-01',
        avatar_url: '👶',
        is_active: true,
        joined_at: '2024-01-01T00:00:00Z',
        invited_by: null,
        metadata: {},
      };

      // Mock RPC call
      supabase.__mockRpc.mockResolvedValueOnce({
        data: newMemberId,
        error: null,
      });

      // Mock fetch of created member + subsequent fetchMembers refresh
      supabase.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newMemberData, error: null }),
        order: vi.fn().mockResolvedValue({ data: [newMemberData], error: null }),
      }));

      const { createChild, loading } = useMembers();
      const toastStore = useToastStore();

      const result = await createChild({
        name: 'Emma',
        birthday: '2020-01-01',
        avatar: '👶',
      });

      expect(loading.value).toBe(false);
      expect(result).not.toBeNull();
      expect(result!.display_name).toBe('Emma');
      expect(result!.role).toBe('child');
      expect(toastStore.toasts.some((t) => t.message.includes('Emma'))).toBe(true);
    });

    it('should handle RPC error on child creation', async () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test House',
        slug: 'test-house',
        role: 'owner',
      });

      const supabase = await getMockedSupabase();
      supabase.__mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Date of birth is required', code: 'P0001', details: null },
      });

      const { createChild, error } = useMembers();

      const result = await createChild({
        name: 'Child',
        birthday: '',
        avatar: '👶',
      });

      expect(result).toBeNull();
      expect(error.value).not.toBeNull();
      expect(error.value!.message).toBe('Date of birth is required');
    });
  });

  describe('inviteMember', () => {
    it('should fail when no household is selected', async () => {
      const householdStore = useHouseholdStore();
      // Clear any household that may have been restored from localStorage
      householdStore.setCurrentHousehold(null);

      const { inviteMember } = useMembers();
      const toastStore = useToastStore();

      const result = await inviteMember('test@example.com');

      expect(result).toBeNull();
      expect(toastStore.toasts.some((t) => t.message.includes('No household'))).toBe(true);
    });

    it('should fail when user is not owner or admin', async () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test House',
        slug: 'test-house',
        role: 'viewer',
      });

      const { inviteMember } = useMembers();
      const toastStore = useToastStore();

      const result = await inviteMember('test@example.com');

      expect(result).toBeNull();
      expect(toastStore.toasts.some((t) => t.message.includes('Only owners and admins'))).toBe(
        true,
      );
    });

    it('should invite a member successfully', async () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test House',
        slug: 'test-house',
        role: 'admin',
      });

      const supabase = await getMockedSupabase();
      const invitationId = 'inv-1';

      supabase.__mockRpc.mockResolvedValueOnce({
        data: invitationId,
        error: null,
      });

      supabase.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: invitationId,
            household_id: 'hh-1',
            email: 'invite@example.com',
            role: 'member',
            status: 'pending',
            token: 'abc123',
            expires_at: '2024-02-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            accepted_at: null,
            invited_by: 'member-1',
          },
          error: null,
        }),
      }));

      const { inviteMember, loading } = useMembers();
      const toastStore = useToastStore();

      const result = await inviteMember('invite@example.com');

      expect(loading.value).toBe(false);
      expect(result).not.toBeNull();
      expect(result!.email).toBe('invite@example.com');
      expect(toastStore.toasts.some((t) => t.message.includes('invite@example.com'))).toBe(true);
    });

    it('should handle duplicate member invitation error', async () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test House',
        slug: 'test-house',
        role: 'owner',
      });

      const supabase = await getMockedSupabase();
      supabase.__mockRpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'User is already a member of this household',
          code: 'P0001',
          details: null,
        },
      });

      const { inviteMember, error } = useMembers();

      const result = await inviteMember('existing@example.com');

      expect(result).toBeNull();
      expect(error.value).not.toBeNull();
      expect(error.value!.message).toContain('already a member');
    });
  });

  describe('removeMember', () => {
    it('should remove a member successfully via soft delete', async () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test House',
        slug: 'test-house',
        role: 'owner',
      });

      // Set up the mock to return success for update operation
      const supabase = await getMockedSupabase();
      const successBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'm-2',
            household_id: 'hh-1',
            user_id: 'user-2',
            role: 'member',
            display_name: 'Test Member',
            is_active: false,
            joined_at: '2024-01-01T00:00:00Z',
          },
          error: null,
        }),
      };
      supabase.from = vi.fn().mockReturnValue(successBuilder);

      const { removeMember } = useMembers();

      const result = await removeMember('m-2');

      expect(result).toBe(true);
    });

    it('should handle soft delete error', async () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test House',
        slug: 'test-house',
        role: 'owner',
      });

      // Get the mocked supabase and override from() to return an error builder
      const supabase = await getMockedSupabase();
      const errorBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied', code: '42501', details: null },
        }),
      };
      supabase.from = vi.fn().mockReturnValue(errorBuilder);

      const { removeMember, error } = useMembers();

      const result = await removeMember('m-1');

      expect(result).toBe(false);
      expect(error.value).not.toBeNull();
    });
  });

  describe('role restrictions', () => {
    it('isOwnerOrAdmin should be true for owner', () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test',
        slug: 'test',
        role: 'owner',
      });

      const { isOwnerOrAdmin } = useMembers();
      expect(isOwnerOrAdmin.value).toBe(true);
    });

    it('isOwnerOrAdmin should be true for admin', () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test',
        slug: 'test',
        role: 'admin',
      });

      const { isOwnerOrAdmin } = useMembers();
      expect(isOwnerOrAdmin.value).toBe(true);
    });

    it('isOwnerOrAdmin should be false for member', () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test',
        slug: 'test',
        role: 'member',
      });

      const { isOwnerOrAdmin } = useMembers();
      expect(isOwnerOrAdmin.value).toBe(false);
    });

    it('isOwnerOrAdmin should be false for child', () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test',
        slug: 'test',
        role: 'child',
      });

      const { isOwnerOrAdmin } = useMembers();
      expect(isOwnerOrAdmin.value).toBe(false);
    });

    it('isOwnerOrAdmin should be false for viewer', () => {
      const householdStore = useHouseholdStore();
      householdStore.setCurrentHousehold({
        id: 'hh-1',
        name: 'Test',
        slug: 'test',
        role: 'viewer',
      });

      const { isOwnerOrAdmin } = useMembers();
      expect(isOwnerOrAdmin.value).toBe(false);
    });
  });
});
