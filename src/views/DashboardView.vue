<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="p-6">
        <h2 class="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          {{ $t('dashboard.greeting', { name: userName }) }}
        </h2>
        <p class="text-neutral-600 dark:text-neutral-400">
          {{ $t('dashboard.subtitle') }}
        </p>
      </div>
    </BaseCard>

    <!-- Pending Invitations -->
    <PendingInvitationsCard @invitation-accepted="handleInvitationAccepted" />

    <!-- Loading state while household is initializing -->
    <LoadingState
      v-if="!householdStore.initialized || householdEntityStore.loading"
      :message="$t('dashboard.loadingData')"
    />

    <template v-else>
      <!-- Active Shopping Lists -->
      <BaseCard :padding="false">
        <div class="p-5">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {{ $t('dashboard.activeShoppingLists') }}
            </h3>
            <RouterLink to="/shopping" class="btn-ghost text-sm">{{
              $t('dashboard.viewAll')
            }}</RouterLink>
          </div>
          <div v-if="allActiveLists.length" class="mt-3 space-y-2">
            <RouterLink
              v-for="list in allActiveLists"
              :key="list.id"
              :to="{ name: 'shopping-list', params: { listId: list.id } }"
              class="interactive-card flex items-center justify-between"
            >
              <div class="min-w-0">
                <p class="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {{ list.title }}
                </p>
                <p
                  v-if="list.description"
                  class="text-xs text-neutral-500 dark:text-neutral-400 truncate"
                >
                  {{ list.description }}
                </p>
              </div>
              <BaseBadge
                :variant="list.status === 'active' ? 'success' : 'neutral'"
                class="flex-shrink-0 ml-2"
              >
                {{ list.status }}
              </BaseBadge>
            </RouterLink>
          </div>
          <p v-else class="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            {{ $t('dashboard.noActiveLists') }}
          </p>
        </div>
      </BaseCard>

      <!-- Household Wishlists -->
      <BaseCard v-if="householdStore.currentHousehold" :padding="false">
        <div class="p-5">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {{ $t('dashboard.householdWishlists') }}
            </h3>
          </div>
          <div v-if="wishlistStore.householdWishlists.length" class="mt-3 space-y-2">
            <RouterLink
              v-for="wishlist in wishlistStore.householdWishlists"
              :key="wishlist.id"
              :to="{ name: 'wishlist-detail', params: { id: wishlist.id } }"
              class="interactive-card flex items-center justify-between"
            >
              <p class="font-medium text-neutral-800 dark:text-neutral-200 truncate flex-1 min-w-0">
                {{ wishlist.title }}
              </p>
              <BaseBadge
                :variant="getVisibilityVariant(wishlist.visibility)"
                class="flex-shrink-0 ml-2"
              >
                {{ getVisibilityLabel(wishlist.visibility) }}
              </BaseBadge>
            </RouterLink>
          </div>
          <p v-else class="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            {{ $t('dashboard.noWishlists') }}
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
      :title="$t('dashboard.welcomeTitle')"
      :description="$t('dashboard.welcomeDescription')"
      :cta="$t('dashboard.createHousehold')"
      @action="() => router.push('/households')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onActivated } from 'vue';
import { storeToRefs } from 'pinia';
import { RouterLink, useRouter, useRoute } from 'vue-router';
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
import { getVisibilityVariant, getVisibilityLabel } from '@/composables/useVisibilityDisplay';

const authStore = useAuthStore();
const householdStore = useHouseholdStore();
const householdEntityStore = useHouseholdEntityStore();
const shoppingStore = useShoppingStore();
const wishlistStore = useWishlistStore();
const router = useRouter();
const route = useRoute();
const { userDisplayName, userAvatarUrl: profileAvatarUrl } = useUserProfile();

// Use storeToRefs for proper reactivity with Pinia
const { currentHousehold } = storeToRefs(householdStore);
const currentHouseholdId = computed(() => currentHousehold.value?.id);

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
  // Load households only - the watcher on currentHouseholdId handles
  // loading wishlists and shopping lists for the current household
  await householdEntityStore.loadHouseholds(userId);
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

// Helper function to load data for current household
const loadRequestToken = ref(0);

async function loadCurrentHouseholdData() {
  const userId = authStore.user?.id;
  const householdId = currentHouseholdId.value;

  if (!userId || !householdId) {
    console.log('[Dashboard] Cannot load data: missing userId or householdId');
    return;
  }

  if (!householdStore.initialized) {
    console.log('[Dashboard] Cannot load data: household store not initialized');
    return;
  }

  const currentToken = ++loadRequestToken.value;
  console.log('[Dashboard] Loading data for household:', householdId, 'token:', currentToken);
  try {
    await Promise.all([
      shoppingStore.loadLists(householdId),
      wishlistStore.loadWishlistsByHousehold(userId, householdId),
      wishlistStore.loadHouseholdWishlists(householdId, userId),
    ]);

    // Only apply results if this is still the latest request
    if (currentToken === loadRequestToken.value) {
      lastLoadedHouseholdId.value = householdId;
      console.log('[Dashboard] Data loaded successfully');
    } else {
      console.log(
        '[Dashboard] Discarding stale data (token:',
        currentToken,
        'current:',
        loadRequestToken.value,
        ')',
      );
    }
  } catch (error) {
    console.error('[Dashboard] Failed to load data:', error);
  }
}

// Load data on component mount
onMounted(async () => {
  console.log('[Dashboard] Component mounted, loading data...');
  await loadCurrentHouseholdData();
});

// Reload data when navigating back to dashboard (important for router reuse)
onActivated(async () => {
  console.log('[Dashboard] Component activated, reloading data...');
  // Force reload by clearing the tracking
  lastLoadedHouseholdId.value = null;
  await loadCurrentHouseholdData();
});

// Watch for route changes to reload data when navigating back to dashboard
// This handles cases where component is reused by Vue Router
watch(
  () => route.name,
  async (routeName) => {
    if (routeName === 'dashboard') {
      console.log('[Dashboard] Navigated to dashboard route, reloading data...');
      // Force reload by clearing the tracking
      lastLoadedHouseholdId.value = null;
      await loadCurrentHouseholdData();
    }
  },
);

watch(
  () => authStore.user?.id,
  async (userId) => {
    if (userId) {
      try {
        await loadDashboardData(userId);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    }
  },
  { immediate: true },
);

// Watch for household switches
watch(currentHouseholdId, async (householdId, oldHouseholdId) => {
  // CRITICAL: Wait for household store initialization before loading data
  // This prevents loading data for stale household ID from localStorage
  if (!householdStore.initialized) {
    console.log('[Dashboard] Waiting for household store initialization before loading data');
    return;
  }

  // Clear tracking if household is deselected
  if (!householdId) {
    lastLoadedHouseholdId.value = null;
    return;
  }

  // Skip if already loaded (unless household actually changed)
  if (householdId === lastLoadedHouseholdId.value && householdId === oldHouseholdId) {
    console.log('[Dashboard] Data already loaded for household:', householdId);
    return;
  }

  await loadCurrentHouseholdData();
});

// When household store is initialized, trigger data load for current household
watch(
  () => householdStore.initialized,
  async (isInitialized) => {
    if (isInitialized && currentHouseholdId.value) {
      console.log(
        '[Dashboard] Household store initialized, loading data for:',
        currentHouseholdId.value,
      );
      await loadCurrentHouseholdData();
    }
  },
);
</script>
