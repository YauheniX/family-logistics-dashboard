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

    <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      <BaseCard>
        <div class="p-5">
          <p class="text-sm font-medium text-neutral-600 dark:text-neutral-400">Active Lists</p>
          <p class="mt-2 text-4xl font-bold text-primary-600 dark:text-primary-400">
            {{ activeListCount }}
          </p>
        </div>
      </BaseCard>
      <BaseCard>
        <div class="p-5">
          <p class="text-sm font-medium text-neutral-600 dark:text-neutral-400">Items to Buy</p>
          <p class="mt-2 text-4xl font-bold text-primary-600 dark:text-primary-400">
            {{ itemsToBuyCount }}
          </p>
        </div>
      </BaseCard>
      <BaseCard>
        <div class="p-5">
          <p class="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Reserved Wishlist Items
          </p>
          <p class="mt-2 text-4xl font-bold text-primary-600 dark:text-primary-400">
            {{ reservedItemsCount }}
          </p>
        </div>
      </BaseCard>
    </div>

    <LoadingState v-if="householdEntityStore.loading" message="Loading your data..." />

    <template v-else>
      <!-- My Households -->
      <BaseCard :padding="false">
        <div class="p-5">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              My Households
            </h3>
            <RouterLink to="/households" class="btn-ghost text-sm">View All</RouterLink>
          </div>
          <div v-if="householdEntityStore.households.length" class="mt-3 space-y-2">
            <RouterLink
              v-for="household in householdEntityStore.households"
              :key="household.id"
              :to="{ name: 'household-detail', params: { id: household.id } }"
              class="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <p class="font-medium text-neutral-800 dark:text-neutral-200">{{ household.name }}</p>
              <span class="text-xs text-neutral-500 dark:text-neutral-400">View →</span>
            </RouterLink>
          </div>
          <p v-else class="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            No households yet.
          </p>
        </div>
      </BaseCard>

      <!-- Active Shopping Lists -->
      <BaseCard :padding="false">
        <div class="p-5">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Active Shopping Lists
            </h3>
            <span class="text-sm text-neutral-600 dark:text-neutral-400"
              >{{ activeListCount }} lists · {{ itemsToBuyCount }} items to buy</span
            >
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
import { computed, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import { useAuthStore } from '@/stores/auth';
import { useHouseholdEntityStore } from '@/features/household/presentation/household.store';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';

const authStore = useAuthStore();
const householdEntityStore = useHouseholdEntityStore();
const shoppingStore = useShoppingStore();
const wishlistStore = useWishlistStore();
const router = useRouter();

const userName = computed(() => {
  const email = authStore.user?.email;
  return email ? email.split('@')[0] : 'there';
});

const allActiveLists = computed(() => shoppingStore.lists.filter((l) => l.status === 'active'));

const activeListCount = computed(() => allActiveLists.value.length);
const itemsToBuyCount = computed(() => shoppingStore.unpurchasedItems.length);
const reservedItemsCount = computed(() => wishlistStore.reservedItems.length);

async function loadDashboardData(userId: string) {
  await Promise.all([
    householdEntityStore.loadHouseholds(userId),
    wishlistStore.loadWishlists(userId),
  ]);

  // Load shopping lists sequentially to avoid excessive concurrent requests
  // when the user belongs to many households
  for (const household of householdEntityStore.households) {
    await shoppingStore.loadLists(household.id);
  }
}

watch(
  () => authStore.user?.id,
  (userId) => {
    if (userId) loadDashboardData(userId);
  },
  { immediate: true },
);
</script>
