<template>
  <div class="space-y-6">
    <div class="glass-card flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <p class="text-sm text-slate-500">Dashboard</p>
        <h2 class="text-2xl font-semibold text-slate-900">Family Shopping & Wishlists</h2>
        <p class="mt-1 text-sm text-slate-600">
          Manage your families, shopping lists, and wishlists in one place.
        </p>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      <div class="glass-card p-4">
        <p class="text-sm text-slate-500">Active Lists</p>
        <p class="text-2xl font-bold text-slate-900">{{ activeListCount }}</p>
      </div>
      <div class="glass-card p-4">
        <p class="text-sm text-slate-500">Items to Buy</p>
        <p class="text-2xl font-bold text-slate-900">{{ itemsToBuyCount }}</p>
      </div>
      <div class="glass-card p-4">
        <p class="text-sm text-slate-500">Reserved Wishlist Items</p>
        <p class="text-2xl font-bold text-slate-900">{{ reservedItemsCount }}</p>
      </div>
    </div>

    <LoadingState v-if="familyStore.loading" message="Loading your data..." />

    <template v-else>
      <!-- My Families -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-900">My Families</h3>
          <RouterLink to="/families" class="btn-ghost text-sm">View All</RouterLink>
        </div>
        <div v-if="familyStore.families.length" class="mt-3 space-y-2">
          <RouterLink
            v-for="family in familyStore.families"
            :key="family.id"
            :to="{ name: 'family-detail', params: { id: family.id } }"
            class="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm hover:bg-slate-50"
          >
            <p class="font-medium text-slate-800">{{ family.name }}</p>
            <span class="text-xs text-slate-500">View →</span>
          </RouterLink>
        </div>
        <p v-else class="mt-3 text-sm text-slate-500">No families yet.</p>
      </div>

      <!-- Active Shopping Lists -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-900">Active Shopping Lists</h3>
          <span class="text-sm text-slate-600">{{ activeListCount }} lists · {{ itemsToBuyCount }} items to buy</span>
        </div>
        <div v-if="allActiveLists.length" class="mt-3 space-y-2">
          <RouterLink
            v-for="list in allActiveLists"
            :key="list.id"
            :to="{ name: 'shopping-list', params: { listId: list.id } }"
            class="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm hover:bg-slate-50"
          >
            <div>
              <p class="font-medium text-slate-800">{{ list.title }}</p>
              <p v-if="list.description" class="text-xs text-slate-500">{{ list.description }}</p>
            </div>
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              :class="list.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'"
            >
              {{ list.status }}
            </span>
          </RouterLink>
        </div>
        <p v-else class="mt-3 text-sm text-slate-500">No active shopping lists.</p>
      </div>

      <!-- My Wishlists -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-900">My Wishlists</h3>
          <RouterLink to="/wishlists" class="btn-ghost text-sm">View All</RouterLink>
        </div>
        <div v-if="wishlistStore.wishlists.length" class="mt-3 space-y-2">
          <RouterLink
            v-for="wishlist in wishlistStore.wishlists"
            :key="wishlist.id"
            :to="{ name: 'wishlist-edit', params: { id: wishlist.id } }"
            class="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm hover:bg-slate-50"
          >
            <p class="font-medium text-slate-800">{{ wishlist.title }}</p>
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              :class="wishlist.is_public ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'"
            >
              {{ wishlist.is_public ? 'Public' : 'Private' }}
            </span>
          </RouterLink>
        </div>
        <p v-else class="mt-3 text-sm text-slate-500">No wishlists yet.</p>
      </div>
    </template>

    <EmptyState
      v-if="!familyStore.loading && !familyStore.families.length && !wishlistStore.wishlists.length"
      title="Welcome!"
      description="Get started by creating a family or a wishlist."
      cta="Create a Family"
      @action="() => router.push('/families')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import EmptyState from '@/components/shared/EmptyState.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import { useAuthStore } from '@/stores/auth';
import { useFamilyStore } from '@/features/family/presentation/family.store';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';

const authStore = useAuthStore();
const familyStore = useFamilyStore();
const shoppingStore = useShoppingStore();
const wishlistStore = useWishlistStore();
const router = useRouter();

const allActiveLists = computed(() =>
  shoppingStore.lists.filter((l) => l.status === 'active'),
);

const activeListCount = computed(() => allActiveLists.value.length);
const itemsToBuyCount = computed(() => shoppingStore.unpurchasedItems.length);
const reservedItemsCount = computed(() => wishlistStore.reservedItems.length);

async function loadDashboardData(userId: string) {
  await Promise.all([
    familyStore.loadFamilies(userId),
    wishlistStore.loadWishlists(userId),
  ]);

  // Load shopping lists sequentially to avoid excessive concurrent requests
  // when the user belongs to many families
  for (const family of familyStore.families) {
    await shoppingStore.loadLists(family.id);
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
