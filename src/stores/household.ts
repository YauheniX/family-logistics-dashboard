import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export interface Household {
  id: string;
  name: string;
  slug: string;
  emoji?: string;
  role: 'owner' | 'admin' | 'member' | 'child' | 'viewer';
}

/**
 * Household context store - manages current household selection
 * In multi-tenant mode, users can belong to multiple households
 */
export const useHouseholdStore = defineStore('household', () => {
  // ─── State ───────────────────────────────────────────────
  const currentHousehold = ref<Household | null>(null);
  const households = ref<Household[]>([]);
  const loading = ref(false);

  // ─── Getters ─────────────────────────────────────────────
  const hasMultipleHouseholds = computed(() => households.value.length > 1);
  const currentRole = computed(() => currentHousehold.value?.role ?? null);
  const isOwnerOrAdmin = computed(
    () => currentRole.value === 'owner' || currentRole.value === 'admin',
  );
  const canManageMembers = computed(() => isOwnerOrAdmin.value);
  const canEditContent = computed(
    () => currentRole.value === 'owner' || currentRole.value === 'admin' || currentRole.value === 'member',
  );

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
      const saved = userHouseholds.find(h => h.id === savedId);
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
    const household = households.value.find(h => h.id === householdId);
    if (household) {
      setCurrentHousehold(household);
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
    // Actions
    setCurrentHousehold,
    loadHouseholds,
    switchHousehold,
    initializeMockHouseholds,
  };
});
