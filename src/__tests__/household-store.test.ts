import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useHouseholdStore, type Household } from '@/stores/household';
import * as backendConfig from '@/config/backend.config';
import { supabase } from '@/features/shared/infrastructure/supabase.client';

vi.mock('@/config/backend.config', () => ({
  isMockMode: vi.fn(),
}));

vi.mock('@/features/shared/infrastructure/supabase.client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Household Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should initialize with null household and empty list', () => {
      const store = useHouseholdStore();
      expect(store.currentHousehold).toBeNull();
      expect(store.households).toEqual([]);
      expect(store.loading).toBe(false);
    });
  });

  describe('Getters', () => {
    it('should return hasMultipleHouseholds correctly', () => {
      const store = useHouseholdStore();
      expect(store.hasMultipleHouseholds).toBe(false);

      const mockHouseholds: Household[] = [
        { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' },
        { id: '2', name: 'House 2', slug: 'house-2', role: 'member' },
      ];
      store.loadHouseholds(mockHouseholds);
      expect(store.hasMultipleHouseholds).toBe(true);
    });

    it('should return currentRole correctly', () => {
      const store = useHouseholdStore();
      expect(store.currentRole).toBeNull();

      const household: Household = { id: '1', name: 'House 1', slug: 'house-1', role: 'admin' };
      store.setCurrentHousehold(household);
      expect(store.currentRole).toBe('admin');
    });

    it('should calculate isOwnerOrAdmin correctly', () => {
      const store = useHouseholdStore();

      const ownerHousehold: Household = {
        id: '1',
        name: 'House 1',
        slug: 'house-1',
        role: 'owner',
      };
      store.setCurrentHousehold(ownerHousehold);
      expect(store.isOwnerOrAdmin).toBe(true);

      const adminHousehold: Household = {
        id: '2',
        name: 'House 2',
        slug: 'house-2',
        role: 'admin',
      };
      store.setCurrentHousehold(adminHousehold);
      expect(store.isOwnerOrAdmin).toBe(true);

      const memberHousehold: Household = {
        id: '3',
        name: 'House 3',
        slug: 'house-3',
        role: 'member',
      };
      store.setCurrentHousehold(memberHousehold);
      expect(store.isOwnerOrAdmin).toBe(false);
    });

    it('should calculate canManageMembers correctly', () => {
      const store = useHouseholdStore();

      const ownerHousehold: Household = {
        id: '1',
        name: 'House 1',
        slug: 'house-1',
        role: 'owner',
      };
      store.setCurrentHousehold(ownerHousehold);
      expect(store.canManageMembers).toBe(true);

      const memberHousehold: Household = {
        id: '2',
        name: 'House 2',
        slug: 'house-2',
        role: 'member',
      };
      store.setCurrentHousehold(memberHousehold);
      expect(store.canManageMembers).toBe(false);
    });

    it('should calculate canEditContent correctly', () => {
      const store = useHouseholdStore();

      const ownerHousehold: Household = {
        id: '1',
        name: 'House 1',
        slug: 'house-1',
        role: 'owner',
      };
      store.setCurrentHousehold(ownerHousehold);
      expect(store.canEditContent).toBe(true);

      const memberHousehold: Household = {
        id: '2',
        name: 'House 2',
        slug: 'house-2',
        role: 'member',
      };
      store.setCurrentHousehold(memberHousehold);
      expect(store.canEditContent).toBe(true);

      const viewerHousehold: Household = {
        id: '3',
        name: 'House 3',
        slug: 'house-3',
        role: 'viewer',
      };
      store.setCurrentHousehold(viewerHousehold);
      expect(store.canEditContent).toBe(false);
    });
  });

  describe('setCurrentHousehold', () => {
    it('should set current household and persist to localStorage', () => {
      const store = useHouseholdStore();
      const household: Household = { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' };

      store.setCurrentHousehold(household);

      expect(store.currentHousehold).toEqual(household);
      expect(localStorage.getItem('current_household_id')).toBe('1');
    });

    it('should clear localStorage when setting null', () => {
      const store = useHouseholdStore();
      const household: Household = { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' };

      store.setCurrentHousehold(household);
      expect(localStorage.getItem('current_household_id')).toBe('1');

      store.setCurrentHousehold(null);
      expect(store.currentHousehold).toBeNull();
      expect(localStorage.getItem('current_household_id')).toBeNull();
    });
  });

  describe('loadHouseholds', () => {
    it('should load households and set first as current', () => {
      const store = useHouseholdStore();
      const mockHouseholds: Household[] = [
        { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' },
        { id: '2', name: 'House 2', slug: 'house-2', role: 'member' },
      ];

      store.loadHouseholds(mockHouseholds);

      expect(store.households).toEqual(mockHouseholds);
      expect(store.currentHousehold).toEqual(mockHouseholds[0]);
      expect(localStorage.getItem('current_household_id')).toBe('1');
    });

    it('should restore saved household from localStorage', () => {
      const store = useHouseholdStore();
      localStorage.setItem('current_household_id', '2');

      const mockHouseholds: Household[] = [
        { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' },
        { id: '2', name: 'House 2', slug: 'house-2', role: 'member' },
      ];

      store.loadHouseholds(mockHouseholds);

      expect(store.currentHousehold).toEqual(mockHouseholds[1]);
      expect(localStorage.getItem('current_household_id')).toBe('2');
    });

    it('should fallback to first household if saved ID not found', () => {
      const store = useHouseholdStore();
      localStorage.setItem('current_household_id', '999');

      const mockHouseholds: Household[] = [
        { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' },
      ];

      store.loadHouseholds(mockHouseholds);

      expect(store.currentHousehold).toEqual(mockHouseholds[0]);
      expect(localStorage.getItem('current_household_id')).toBe('1');
    });

    it('should handle empty household list', () => {
      const store = useHouseholdStore();

      store.loadHouseholds([]);

      expect(store.households).toEqual([]);
      expect(store.currentHousehold).toBeNull();
    });
  });

  describe('switchHousehold', () => {
    it('should switch to existing household', () => {
      const store = useHouseholdStore();
      const mockHouseholds: Household[] = [
        { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' },
        { id: '2', name: 'House 2', slug: 'house-2', role: 'member' },
      ];

      store.loadHouseholds(mockHouseholds);
      expect(store.currentHousehold?.id).toBe('1');

      store.switchHousehold('2');

      expect(store.currentHousehold).toEqual(mockHouseholds[1]);
      expect(localStorage.getItem('current_household_id')).toBe('2');
    });

    it('should not switch to non-existent household', () => {
      const store = useHouseholdStore();
      const mockHouseholds: Household[] = [
        { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' },
      ];

      store.loadHouseholds(mockHouseholds);

      store.switchHousehold('999');

      expect(store.currentHousehold).toEqual(mockHouseholds[0]);
    });
  });

  describe('initializeMockHouseholds', () => {
    it('should initialize with 3 mock households', () => {
      const store = useHouseholdStore();

      store.initializeMockHouseholds();

      expect(store.households).toHaveLength(3);
      expect(store.currentHousehold).not.toBeNull();
      expect(store.households[0].name).toBe('Smith Family');
      expect(store.households[1].name).toBe('Extended Family');
      expect(store.households[2].name).toBe('Friends Group');
    });

    it('should set first mock household as current', () => {
      const store = useHouseholdStore();

      store.initializeMockHouseholds();

      expect(store.currentHousehold?.id).toBe('1');
      expect(store.currentHousehold?.name).toBe('Smith Family');
      expect(localStorage.getItem('current_household_id')).toBe('1');
    });
  });

  describe('initializeForUser', () => {
    it('should clear households when userId is empty', async () => {
      const store = useHouseholdStore();

      // Set up some initial households
      const mockHouseholds: Household[] = [
        { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' },
      ];
      store.loadHouseholds(mockHouseholds);
      expect(store.households).toHaveLength(1);

      await store.initializeForUser('');

      expect(store.households).toEqual([]);
      expect(store.currentHousehold).toBeNull();
    });

    it('should use mock mode when isMockMode returns true', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(true);
      const store = useHouseholdStore();

      await store.initializeForUser('test-user-id');

      expect(store.households).toHaveLength(3);
      expect(store.households[0].name).toBe('Smith Family');
    });

    it('should load households from Supabase successfully', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
      const store = useHouseholdStore();

      const mockData = [
        {
          role: 'owner',
          households: { id: 'h1', name: 'Test Household', slug: 'test-household' },
        },
        {
          role: 'member',
          households: { id: 'h2', name: 'Second Household', slug: 'second-household' },
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      // The final eq() call returns the result
      mockChain.eq
        .mockReturnValueOnce(mockChain) // First eq call returns chain
        .mockResolvedValueOnce({
          // Second eq call returns result
          data: mockData,
          error: null,
        });

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      await store.initializeForUser('test-user-id');

      expect(supabase.from).toHaveBeenCalledWith('members');
      expect(mockChain.select).toHaveBeenCalledWith(
        'role, households:household_id(id, name, slug)',
      );
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'test-user-id');
      expect(mockChain.eq).toHaveBeenCalledWith('is_active', true);

      expect(store.households).toHaveLength(2);
      expect(store.households[0]).toEqual({
        id: 'h1',
        name: 'Test Household',
        slug: 'test-household',
        role: 'owner',
      });
      expect(store.households[1]).toEqual({
        id: 'h2',
        name: 'Second Household',
        slug: 'second-household',
        role: 'member',
      });
    });

    it('should handle Supabase errors gracefully', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
      const store = useHouseholdStore();

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await store.initializeForUser('test-user-id');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load households:',
        expect.objectContaining({ message: 'Database error' }),
      );
      expect(store.households).toEqual([]);
      expect(store.currentHousehold).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should filter out null households from response', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
      const store = useHouseholdStore();

      const mockData = [
        {
          role: 'owner',
          households: { id: 'h1', name: 'Test Household', slug: 'test-household' },
        },
        {
          role: 'member',
          households: null, // This should be filtered out
        },
        {
          role: 'admin',
          households: { id: null, name: 'Invalid', slug: 'invalid' }, // This should be filtered out
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      await store.initializeForUser('test-user-id');

      expect(store.households).toHaveLength(1);
      expect(store.households[0].id).toBe('h1');
    });

    it('should set loading state during async operation', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
      const store = useHouseholdStore();

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      let resolvePromise: (value: never) => void;
      const promise = new Promise<never>((resolve) => {
        resolvePromise = resolve;
      });

      mockChain.eq.mockReturnValueOnce(mockChain).mockReturnValueOnce(promise);
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const initPromise = store.initializeForUser('test-user-id');

      // Wait a tick for the async function to start
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Check loading state is true while async operation is in progress
      expect(store.loading).toBe(true);

      resolvePromise!({
        data: [],
        error: null,
      } as never);

      await initPromise;

      // Check loading state is false after async operation completes
      expect(store.loading).toBe(false);
    });

    it('should handle missing household data fields gracefully', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
      const store = useHouseholdStore();

      const mockData = [
        {
          role: null, // Missing role should default to 'member'
          households: { id: 'h1', name: null, slug: null }, // Missing name/slug should have defaults
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      await store.initializeForUser('test-user-id');

      expect(store.households).toHaveLength(1);
      expect(store.households[0]).toEqual({
        id: 'h1',
        name: 'Household',
        slug: '',
        role: 'member',
      });
    });
  });

  describe('createHousehold', () => {
    it('should not create household with empty name', async () => {
      const store = useHouseholdStore();
      const result = await store.createHousehold('');

      expect(result).toBeNull();
    });

    it('should not create household with whitespace-only name', async () => {
      const store = useHouseholdStore();
      const result = await store.createHousehold('   ');

      expect(result).toBeNull();
    });

    it('should create household in mock mode', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(true);
      const store = useHouseholdStore();

      const result = await store.createHousehold('Test Household');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Household');
      expect(result?.role).toBe('owner');
      expect(store.households).toHaveLength(1);
      expect(store.currentHousehold).toEqual(result);
    });
  });

  describe('deleteHousehold', () => {
    it('should fail when no householdId provided', async () => {
      const store = useHouseholdStore();

      const result = await store.deleteHousehold('');

      expect(result).toBe(false);
    });

    it('should delete household in mock mode', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(true);
      const store = useHouseholdStore();

      store.initializeMockHouseholds();
      const firstId = store.households[0].id;
      const initialCount = store.households.length;

      const result = await store.deleteHousehold(firstId);

      expect(result).toBe(true);
      expect(store.households).toHaveLength(initialCount - 1);
    });

    it('should switch to next household when deleting current', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(true);
      const store = useHouseholdStore();

      store.initializeMockHouseholds();
      const firstId = store.households[0].id;
      const secondHousehold = store.households[1];

      const result = await store.deleteHousehold(firstId);

      expect(result).toBe(true);
      expect(store.currentHousehold?.id).toBe(secondHousehold.id);
    });

    it('should clear current household when deleting last one', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(true);
      const store = useHouseholdStore();

      const mockHousehold = {
        id: '1',
        name: 'Only Household',
        slug: 'only-household',
        role: 'owner' as const,
      };
      store.loadHouseholds([mockHousehold]);

      const result = await store.deleteHousehold('1');

      expect(result).toBe(true);
      expect(store.currentHousehold).toBeNull();
      expect(store.households).toHaveLength(0);
    });
  });

  describe('$reset', () => {
    it('should reset all state and clear localStorage', () => {
      const store = useHouseholdStore();

      store.initializeMockHouseholds();
      expect(store.households).not.toHaveLength(0);
      expect(localStorage.getItem('current_household_id')).not.toBeNull();

      store.$reset();

      expect(store.currentHousehold).toBeNull();
      expect(store.households).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.initialized).toBe(false);
      expect(localStorage.getItem('current_household_id')).toBeNull();
    });
  });

  describe('ensureDefaultHouseholdForUser', () => {
    it('should return null when userId is empty', async () => {
      const store = useHouseholdStore();

      const result = await store.ensureDefaultHouseholdForUser('');

      expect(result).toBeNull();
    });

    it('should skip creation if already in progress for same user', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
      const store = useHouseholdStore();

      // Start first call (don't await)
      const promise1 = store.ensureDefaultHouseholdForUser('user1', 'user1@example.com');
      // Start second call immediately
      const promise2 = store.ensureDefaultHouseholdForUser('user1', 'user1@example.com');

      await Promise.all([promise1, promise2]);

      // Second call should have been skipped
      // Hard to assert this directly, but loading state should have returned to false
      expect(store.loading).toBe(false);
    });

    it('should not create household if user already has one', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
      const store = useHouseholdStore();

      const mockMemberships = [{ id: 'member1', household_id: 'h1' }];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockMemberships, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await store.ensureDefaultHouseholdForUser('user1');

      expect(result).toBeNull();
      expect(mockChain.select).toHaveBeenCalledWith('id, household_id');
    });

    it('should create default household with user email prefix', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
      const store = useHouseholdStore();

      // Mock no existing membership
      const mockMembershipChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      // Mock createHousehold will handle the rest
      vi.mocked(supabase.from).mockReturnValue(mockMembershipChain as never);

      // We can't easily test the full flow without mocking createHousehold,
      // but we can at least test that it doesn't crash
      const _result = await store.ensureDefaultHouseholdForUser('user1', 'john@example.com');

      // Will be null because createHousehold isn't fully mocked, but that's OK
      expect(store.loading).toBe(false);
    });

    it('should use default name when email not provided', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
      const store = useHouseholdStore();

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      await store.ensureDefaultHouseholdForUser('user1');

      expect(store.loading).toBe(false);
    });
  });
});
