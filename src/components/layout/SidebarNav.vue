<template>
  <div
    v-if="mobileOpen"
    class="fixed inset-0 z-40 bg-black/40 lg:hidden"
    aria-hidden="true"
    @click="emit('close')"
  ></div>

  <aside
    class="fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-5 py-6 transform transition-transform duration-200 lg:hidden"
    :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'"
    :aria-hidden="mobileOpen ? 'false' : 'true'"
  >
    <!-- Logo/Brand -->
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-2xl" aria-hidden="true">🏡</span>
        <h2 class="text-xl font-bold text-neutral-900 dark:text-neutral-50">FamilyBoard</h2>
      </div>
      <p class="text-xs text-neutral-500 dark:text-neutral-400 ml-8">Keeping families connected</p>
    </div>

    <!-- Current Household Display -->
    <div
      v-if="currentHousehold"
      class="mb-6 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/40 dark:to-primary-800/40 p-4 border border-primary-200 dark:border-primary-700"
    >
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xl" aria-hidden="true">{{ currentHousehold.emoji || '🏠' }}</span>
        <p class="font-semibold text-neutral-900 dark:text-neutral-50 truncate">
          {{ currentHousehold.name }}
        </p>
      </div>
      <p class="text-xs text-neutral-600 dark:text-neutral-400 capitalize ml-7">
        {{ currentHousehold.role }}
      </p>
    </div>

    <!-- Navigation -->
    <nav class="space-y-1">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        :class="
          route.name === item.name
            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800'
            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
        "
        @click="emit('close')"
      >
        <span class="text-lg" aria-hidden="true">{{ item.emoji }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>

  <aside
    class="hidden w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-5 py-6 lg:block"
  >
    <!-- Logo/Brand -->
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-2xl" aria-hidden="true">🏡</span>
        <h2 class="text-xl font-bold text-neutral-900 dark:text-neutral-50">FamilyBoard</h2>
      </div>
      <p class="text-xs text-neutral-500 dark:text-neutral-400 ml-8">Keeping families connected</p>
    </div>

    <!-- Current Household Display -->
    <div
      v-if="currentHousehold"
      class="mb-6 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/40 dark:to-primary-800/40 p-4 border border-primary-200 dark:border-primary-700"
    >
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xl" aria-hidden="true">{{ currentHousehold.emoji || '🏠' }}</span>
        <p class="font-semibold text-neutral-900 dark:text-neutral-50 truncate">
          {{ currentHousehold.name }}
        </p>
      </div>
      <p class="text-xs text-neutral-600 dark:text-neutral-400 capitalize ml-7">
        {{ currentHousehold.role }}
      </p>
    </div>

    <!-- Navigation -->
    <nav class="space-y-1">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        :class="
          route.name === item.name
            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800'
            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
        "
      >
        <span class="text-lg" aria-hidden="true">{{ item.emoji }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useHouseholdStore } from '@/stores/household';

withDefaults(
  defineProps<{
    userEmail?: string | null;
    mobileOpen?: boolean;
  }>(),
  {
    mobileOpen: false,
    userEmail: null,
  },
);

const emit = defineEmits<{
  close: [];
}>();

const route = useRoute();
const householdStore = useHouseholdStore();

const currentHousehold = computed(() => householdStore.currentHousehold);

const items = computed(() => [
  { name: 'dashboard', label: 'Home', to: '/', emoji: '🏠' },
  { name: 'family-list', label: 'Members', to: '/families', emoji: '👨‍👩‍👧‍👦' },
  { name: 'shopping', label: 'Shopping', to: { name: 'shopping' }, emoji: '🛒' },
  { name: 'wishlist-list', label: 'Wishlists', to: '/wishlists', emoji: '🎁' },
  { name: 'settings', label: 'Settings', to: '/settings', emoji: '⚙️' },
]);
</script>
