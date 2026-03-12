import { computed } from 'vue';
import { useHouseholdStore } from '@/stores/household';

/**
 * Composable that exposes role-based UI permission flags for the current
 * household member.  All checks mirror the RLS rules enforced on the
 * backend; these are UI-level guards only and must not be relied upon for
 * security.
 */
export function useHouseholdPermissions() {
  const householdStore = useHouseholdStore();

  /** True for any authenticated user who has a role in the current household. */
  const canReadHouseholdResource = computed(() => householdStore.currentRole !== null);

  /** True for owner and admin roles (mirrors canManageMembers in the store). */
  const canManageMembers = computed(() => householdStore.isOwnerOrAdmin);

  /** True for owner and admin roles. */
  const isOwnerOrAdmin = computed(() => householdStore.isOwnerOrAdmin);

  return {
    canReadHouseholdResource,
    canManageMembers,
    isOwnerOrAdmin,
  };
}
