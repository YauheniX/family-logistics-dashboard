<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="p-6">
        <h2 class="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Good morning, {{ userName }}!
        </h2>
        <p class="mt-2 text-neutral-600 dark:text-neutral-400">
          Manage your household, shopping lists, and wishlists in one place.
        </p>
      </div>
    </BaseCard>

    <!-- Pending Invitations -->
    <PendingInvitationsCard @invitation-accepted="handleInvitationAccepted" />

    <LoadingState v-if="householdEntityStore.loading" message="Loading your data..." />

    <template v-else>
      <!-- Active Shopping Lists -->
      <BaseCard :padding="false">
        <div class="p-5">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Active Shopping Lists
            </h3>
            <RouterLink to="/shopping" class="btn-ghost text-sm">View All</RouterLink>
          </div>
          <div v-if="allActiveLists.length" class="mt-3 space-y-2">
            <RouterLink
              v-for="list in allActiveLists"
              :key="list.id"
              :to="{ name: 'shopping-list', params: { listId: list.id } }"
              class="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <div>
                <p class="font-medium text-neutral-800 dark:text-neutral-200">{{ list.title }}</p>
                <p v-if="list.description" class="text-xs text-neutral-500 dark:text-neutral-400">
                  {{ list.description }}
                </p>
              </div>
              <BaseBadge :variant="list.status === 'active' ? 'success' : 'neutral'">
                {{ list.status }}
              </BaseBadge>
            </RouterLink>
          </div>
          <p v-else class="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            No active shopping lists.
          </p>
        </div>
      </BaseCard>

      <!-- My Wishlists -->
      <BaseCard :padding="false">
        <div class="p-5">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              My Wishlists
            </h3>
            <RouterLink to="/wishlists" class="btn-ghost text-sm">View All</RouterLink>
          </div>
          <div v-if="wishlistStore.wishlists.length" class="mt-3 space-y-2">
            <RouterLink
              v-for="wishlist in wishlistStore.wishlists"
              :key="wishlist.id"
              :to="{ name: 'wishlist-edit', params: { id: wishlist.id } }"
              class="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <p class="font-medium text-neutral-800 dark:text-neutral-200">{{ wishlist.title }}</p>
              <BaseBadge :variant="wishlist.is_public ? 'primary' : 'neutral'">
                {{ wishlist.is_public ? 'Public' : 'Private' }}
              </BaseBadge>
            </RouterLink>
          </div>
          <p v-else class="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            No wishlists yet.
          </p>
        </div>
      </BaseCard>
    </template>

    <EmptyState
      v-if="
        !householdEntityStore.loading &&
        !householdEntityStore.households.length &&
        !wishlistStore.wishlists.length
      "
      title="Welcome!"
      description="Get started by creating a household or a wishlist."
      cta="Create a Household"
      @action="() => router.push('/households')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import PendingInvitationsCard from '@/components/invitations/PendingInvitationsCard.vue';
import { useAuthStore } from '@/stores/auth';
import { useHouseholdStore } from '@/stores/household';
import { useHouseholdEntityStore } from '@/features/household/presentation/household.store';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';
import { useUserProfile } from '@/composables/useUserProfile';
import { resolveUserProfile } from '@/utils/profileResolver';

const authStore = useAuthStore();
const householdStore = useHouseholdStore();
const householdEntityStore = useHouseholdEntityStore();
const shoppingStore = useShoppingStore();
const wishlistStore = useWishlistStore();
const router = useRouter();
const { userDisplayName, userAvatarUrl: profileAvatarUrl } = useUserProfile();

// Track last loaded household to prevent duplicate loads
const lastLoadedHouseholdId = ref<string | null>(null);

const userName = computed(() => {
  const profile = resolveUserProfile(
    {
      display_name: userDisplayName.value,
      avatar_url: profileAvatarUrl.value,
    },
    authStore.user,
    authStore.user?.email,
  );
  return profile.name;
});

const allActiveLists = computed(() => shoppingStore.lists.filter((l) => l.status === 'active'));

async function loadDashboardData(userId: string) {
  await Promise.all([
    householdEntityStore.loadHouseholds(userId),
    wishlistStore.loadWishlists(userId),
  ]);

  // Load shopping lists for current household if one is selected
  // The watcher handles subsequent household switches
  const currentHouseholdId = householdStore.currentHousehold?.id;

  // Clear tracking if household is deselected
  if (!currentHouseholdId) {
    lastLoadedHouseholdId.value = null;
    return;
  }

  // Skip if already loaded
  if (currentHouseholdId === lastLoadedHouseholdId.value) {
    return;
  }

  // Only update tracking after successful load
  try {
    await shoppingStore.loadLists(currentHouseholdId);
    lastLoadedHouseholdId.value = currentHouseholdId;
  } catch (error) {
    console.error('Failed to load shopping lists:', error);
  }
}

async function handleInvitationAccepted() {
  // Reload households when user accepts an invitation
  if (authStore.user?.id) {
    try {
      await householdEntityStore.loadHouseholds(authStore.user.id);
    } catch (error) {
      console.error('Failed to reload households after invitation acceptance:', error);
    }
  }
}

watch(
  () => authStore.user?.id,
  (userId) => {
    if (userId) loadDashboardData(userId);
  },
  { immediate: true },
);

// Watch for household switches
watch(
  () => householdStore.currentHousehold?.id,
  async (currentHouseholdId) => {
    // Clear tracking if household is deselected
    if (!currentHouseholdId) {
      lastLoadedHouseholdId.value = null;
      return;
    }

    // Skip if already loaded
    if (currentHouseholdId === lastLoadedHouseholdId.value) {
      return;
    }

    // Only update tracking after successful load
    try {
      await shoppingStore.loadLists(currentHouseholdId);
      lastLoadedHouseholdId.value = currentHouseholdId;
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
    }
  },
);
</script>
