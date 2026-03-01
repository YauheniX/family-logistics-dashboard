<template>
  <div
    v-if="mobileOpen"
    class="fixed inset-0 z-40 bg-black/40 lg:hidden transition-opacity duration-normal backdrop-blur-sm"
    aria-hidden="true"
    @click="emit('close')"
  ></div>

  <aside
    class="fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-5 py-6 transform transition-transform duration-slow lg:hidden shadow-2xl"
    :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'"
    :aria-hidden="mobileOpen ? 'false' : 'true'"
  >
    <!-- Logo/Brand -->
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-2xl" aria-hidden="true">🏡</span>
        <h2 class="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          {{ $t('nav.brandName') }}
        </h2>
      </div>
      <p class="text-xs text-neutral-500 dark:text-neutral-400 ml-8">
        {{ $t('nav.brandTagline') }}
      </p>
    </div>

    <!-- Current Household Display -->
    <div
      v-if="currentHousehold"
      class="mb-6 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/40 dark:to-primary-800/40 p-4 border border-primary-200 dark:border-primary-700 shadow-soft hover:shadow-medium transition-shadow duration-normal"
    >
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xl animate-bounce-subtle" aria-hidden="true">{{
          currentHousehold.emoji || '🏠'
        }}</span>
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
        :key="item.name"
        :to="item.to"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-normal focus-ring group"
        :class="
          isActive(item.name)
            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800 shadow-soft'
            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:shadow-soft hover:translate-x-1'
        "
        @click="emit('close')"
      >
        <span class="text-lg transition-transform group-hover:scale-110" aria-hidden="true">{{
          item.emoji
        }}</span>
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
        <h2 class="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          {{ $t('nav.brandName') }}
        </h2>
      </div>
      <p class="text-xs text-neutral-500 dark:text-neutral-400 ml-8">
        {{ $t('nav.brandTagline') }}
      </p>
    </div>

    <!-- Current Household Display -->
    <div
      v-if="currentHousehold"
      class="mb-6 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/40 dark:to-primary-800/40 p-4 border border-primary-200 dark:border-primary-700 shadow-soft hover:shadow-medium transition-shadow duration-normal"
    >
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xl animate-bounce-subtle" aria-hidden="true">{{
          currentHousehold.emoji || '🏠'
        }}</span>
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
        :key="item.name"
        :to="item.to"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-normal focus-ring group"
        :class="
          isActive(item.name)
            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800 shadow-soft'
            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:shadow-soft hover:translate-x-1'
        "
      >
        <span class="text-lg transition-transform group-hover:scale-110" aria-hidden="true">{{
          item.emoji
        }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
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

const { t } = useI18n();
const route = useRoute();
const householdStore = useHouseholdStore();

const currentHousehold = computed(() => householdStore.currentHousehold);

function isActive(itemName: string): boolean {
  const currentRouteName = route.name as string;
  return currentRouteName === itemName || route.matched.some((record) => record.name === itemName);
}

const items = computed(() => [
  {
    name: 'household-list',
    label: t('nav.households'),
    to: '/households',
    emoji: '🏘️',
  },
  { name: 'shopping', label: t('nav.shopping'), to: { name: 'shopping' }, emoji: '🛒' },
  { name: 'wishlist-list', label: t('nav.wishlists'), to: '/wishlists', emoji: '🎁' },
  { name: 'apps', label: t('nav.apps'), to: '/apps', emoji: '🎮' },
  { name: 'settings', label: t('nav.settings'), to: '/settings', emoji: '⚙️' },
]);
</script>
