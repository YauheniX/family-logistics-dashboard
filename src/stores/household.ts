import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { isMockMode } from '@/config/backend.config';
import { supabase } from '@/features/shared/infrastructure/supabase.client';
import { useToastStore } from '@/stores/toast';

export interface Household {
  id: string;
  name: string;
  slug: string;
  emoji?: string;
  role: 'owner' | 'admin' | 'member' | 'child' | 'viewer';
}

type HouseholdRole = Household['role'];

/**
 * Household context store - manages current household selection
 * In multi-tenant mode, users can belong to multiple households
 */
export const useHouseholdStore = defineStore('household', () => {
  // ─── State ───────────────────────────────────────────────
  const currentHousehold = ref<Household | null>(null);
  const households = ref<Household[]>([]);
  const loading = ref(false);

  // Track the user we're currently initializing for (prevents race conditions on logout)
  const _activeUserId = ref<string | null>(null);

  // ─── Getters ─────────────────────────────────────────────
  const hasMultipleHouseholds = computed(() => households.value.length > 1);
  const currentRole = computed(() => currentHousehold.value?.role ?? null);
  const isOwnerOrAdmin = computed(
    () => currentRole.value === 'owner' || currentRole.value === 'admin',
  );
  const canManageMembers = computed(() => isOwnerOrAdmin.value);
  const canEditContent = computed(
    () =>
      currentRole.value === 'owner' ||
      currentRole.value === 'admin' ||
      currentRole.value === 'member',
  );

  // ─── Reset ──────────────────────────────────────────────

  /** Reset store to initial state (call on logout) */
  function $reset() {
    _activeUserId.value = null; // Cancel any in-flight operations
    currentHousehold.value = null;
    households.value = [];
    loading.value = false;
    localStorage.removeItem('current_household_id');
  }

  // ─── Actions ─────────────────────────────────────────────
  function setCurrentHousehold(household: Household | null) {
    currentHousehold.value = household;

    // Persist to localStorage
    if (household) {
      localStorage.setItem('current_household_id', household.id);
    } else {
      localStorage.removeItem('current_household_id');
    }
  }

  function loadHouseholds(userHouseholds: Household[]) {
    households.value = userHouseholds;

    // Try to restore previous selection
    const savedId = localStorage.getItem('current_household_id');
    if (savedId) {
      const saved = userHouseholds.find((h) => h.id === savedId);
      if (saved) {
        setCurrentHousehold(saved);
        return;
      }
    }

    // Default to first household
    if (userHouseholds.length > 0) {
      setCurrentHousehold(userHouseholds[0]);
    }
  }

  function switchHousehold(householdId: string) {
    const household = households.value.find((h) => h.id === householdId);
    if (household) {
      setCurrentHousehold(household);
    }
  }

  async function initializeForUser(userId: string) {
    if (!userId) {
      loadHouseholds([]);
      setCurrentHousehold(null);
      return;
    }

    // Track active user to prevent race conditions on logout
    _activeUserId.value = userId;

    if (isMockMode()) {
      initializeMockHouseholds();
      return;
    }

    loading.value = true;
    try {
      // members.household_id -> households.id relationship
      const { data, error } = await supabase
        .from('members')
        .select('role, households:household_id(id, name, slug)')
        .eq('user_id', userId)
        .eq('is_active', true);

      // Guard: abort if user changed during async operation (e.g., logged out)
      if (_activeUserId.value !== userId) {
        console.log('[household] initializeForUser aborted: user changed during fetch');
        return;
      }

      if (error) {
        console.error('Failed to load households:', error);
        loadHouseholds([]);
        setCurrentHousehold(null);
        return;
      }

      const mapped: Household[] = (data ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((row: any) => {
          const household = row.households;
          if (!household?.id) return null;
          return {
            id: String(household.id),
            name: String(household.name ?? 'Household'),
            slug: String(household.slug ?? ''),
            role: (row.role as HouseholdRole) ?? 'member',
          } satisfies Household;
        })
        .filter(Boolean) as Household[];

      loadHouseholds(mapped);
    } finally {
      loading.value = false;
    }
  }

  // For demo/mock mode - populate with sample households
  function initializeMockHouseholds() {
    const mockHouseholds: Household[] = [
      {
        id: '1',
        name: 'Smith Family',
        slug: 'smith-family',
        emoji: '🏠',
        role: 'owner',
      },
      {
        id: '2',
        name: 'Extended Family',
        slug: 'extended-family',
        emoji: '👨‍👩‍👧‍👦',
        role: 'member',
      },
      {
        id: '3',
        name: 'Friends Group',
        slug: 'friends-group',
        emoji: '🎉',
        role: 'admin',
      },
    ];

    loadHouseholds(mockHouseholds);
  }

  const ensuringForUserIds = new Set<string>();

  async function ensureDefaultHouseholdForUser(userId: string, userEmail?: string | null) {
    const toast = useToastStore();
    if (!userId) return null;
    if (ensuringForUserIds.has(userId)) {
      console.log('[household] Skipping duplicate default household creation for user', userId);
      return null;
    }

    ensuringForUserIds.add(userId);
    // Track active user to prevent race conditions on logout
    _activeUserId.value = userId;
    loading.value = true;

    try {
      console.log('[household] Verifying default household for user', userId);
      const { data: existingMemberships, error: membershipError } = await supabase
        .from('members')
        .select('id, household_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      // Guard: abort if user changed during async operation (e.g., logged out)
      if (_activeUserId.value !== userId) {
        console.log('[household] ensureDefaultHouseholdForUser aborted: user changed');
        return null;
      }

      if (membershipError) {
        console.error('[household] Failed to check existing memberships', membershipError);
        toast.error('Failed to verify household membership');
        return null;
      }

      if ((existingMemberships ?? []).length > 0) {
        console.log(
          '[household] Existing household membership found, skipping creation',
          existingMemberships,
        );
        return null;
      }

      const defaultName = userEmail ? `${userEmail.split('@')[0]}'s household` : 'My Household';
      const created = await createHousehold(defaultName);

      // Guard: abort if user changed during household creation
      if (_activeUserId.value !== userId) {
        console.log('[household] ensureDefaultHouseholdForUser aborted after create: user changed');
        return null;
      }

      if (!created) {
        console.error('[household] Default household creation failed for user', userId);
        toast.error('Could not create your default household');
        return null;
      }

      console.log('[household] Default household created', created);
      toast.success('Your household is ready');
      return created;
    } catch (error) {
      console.error('[household] Unexpected error while ensuring default household', error);
      toast.error('Unexpected error while creating household');
      return null;
    } finally {
      ensuringForUserIds.delete(userId);
      loading.value = false;
    }
  }
  async function createHousehold(name: string) {
    const toast = useToastStore();

    if (!name || !name.trim()) {
      toast.error('Household name is required');
      return null;
    }

    if (isMockMode()) {
      const mock: Household = {
        id: String(Date.now()),
        name: name.trim(),
        slug: name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-'),
        role: 'owner',
      };
      households.value.unshift(mock);
      setCurrentHousehold(mock);
      toast.success('Household created (mock)');
      return mock;
    }

    loading.value = true;
    try {
      // Use atomic RPC function to create household and owner member in one transaction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error: rpcError } = await (supabase.rpc as any)(
        'create_household_with_owner',
        {
          p_name: name.trim(),
          p_creator_display_name: null, // Let RPC auto-determine from user profile
        },
      );

      if (rpcError || !result) {
        toast.error(`Failed to create household: ${rpcError?.message ?? 'unknown error'}`);
        return null;
      }

      // Fetch the created household with full details
      const { data: householdData, error: fetchError } = await supabase
        .from('households')
        .select('*')
        .eq('id', result.household_id)
        .single();

      if (fetchError || !householdData) {
        toast.error(`Failed to fetch created household: ${fetchError?.message ?? 'unknown'}`);
        return null;
      }

      const newHousehold: Household = {
        id: String(householdData.id),
        name: String(householdData.name),
        slug: String(householdData.slug ?? ''),
        role: 'owner',
      };

      // Guard: don't set state if user logged out during async operation
      if (_activeUserId.value === null) {
        console.log('[household] createHousehold aborted: user logged out');
        return null;
      }

      households.value.unshift(newHousehold);
      setCurrentHousehold(newHousehold);
      toast.success('Household created successfully');
      return newHousehold;
    } finally {
      loading.value = false;
    }
  }

  async function deleteHousehold(householdId: string) {
    const toast = useToastStore();

    if (!householdId) {
      toast.error('Household ID is required');
      return false;
    }

    if (isMockMode()) {
      households.value = households.value.filter((h) => h.id !== householdId);

      // If deleted household was current, select first available
      if (currentHousehold.value?.id === householdId) {
        if (households.value.length > 0) {
          setCurrentHousehold(households.value[0]);
        } else {
          setCurrentHousehold(null);
        }
      }

      toast.success('Household deleted (mock)');
      return true;
    }

    loading.value = true;
    try {
      const { error: deleteError } = await supabase
        .from('households')
        .delete()
        .eq('id', householdId);

      if (deleteError) {
        toast.error(`Failed to delete household: ${deleteError.message}`);
        return false;
      }

      // Guard: abort if user changed during async operation
      if (_activeUserId.value === null) {
        console.log('[household] deleteHousehold aborted: user logged out');
        return false;
      }

      // Remove from local state
      households.value = households.value.filter((h) => h.id !== householdId);

      // If deleted household was current, select first available
      if (currentHousehold.value?.id === householdId) {
        if (households.value.length > 0) {
          setCurrentHousehold(households.value[0]);
          toast.success(`Household deleted. Switched to ${households.value[0].name}`);
        } else {
          setCurrentHousehold(null);
          toast.success('Household deleted');
        }
      } else {
        toast.success('Household deleted');
      }

      return true;
    } catch (error) {
      console.error('[household] Unexpected error while deleting household:', error);
      toast.error('Unexpected error while deleting household');
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    currentHousehold,
    households,
    loading,
    // Getters
    hasMultipleHouseholds,
    currentRole,
    isOwnerOrAdmin,
    canManageMembers,
    canEditContent,
    // Reset
    $reset,
    // Actions
    setCurrentHousehold,
    loadHouseholds,
    switchHousehold,
    initializeForUser,
    initializeMockHouseholds,
    createHousehold,
    deleteHousehold,
    ensureDefaultHouseholdForUser,
  };
});
