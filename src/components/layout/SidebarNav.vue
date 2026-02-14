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
    <div class="mb-8">
      <p class="text-xs uppercase tracking-wide text-primary-500 dark:text-primary-400">Family</p>
      <h2 class="text-h2 text-neutral-900 dark:text-neutral-50">FamilyBoard</h2>
    </div>

    <!-- User Info -->
    <div
      class="mb-6 rounded-lg bg-white dark:bg-neutral-900 p-4 text-sm border border-neutral-200 dark:border-neutral-700"
    >
      <p class="font-semibold text-neutral-900 dark:text-neutral-50">Welcome</p>
      <p class="mt-1 break-words text-neutral-600 dark:text-neutral-400">
        {{ userEmail || 'Authenticated user' }}
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
    <div class="mb-8">
      <p class="text-xs uppercase tracking-wide text-primary-500 dark:text-primary-400">Family</p>
      <h2 class="text-h2 text-neutral-900 dark:text-neutral-50">FamilyBoard</h2>
    </div>

    <!-- User Info -->
    <div
      class="mb-6 rounded-lg bg-white dark:bg-neutral-900 p-4 text-sm border border-neutral-200 dark:border-neutral-700"
    >
      <p class="font-semibold text-neutral-900 dark:text-neutral-50">Welcome</p>
      <p class="mt-1 break-words text-neutral-600 dark:text-neutral-400">
        {{ userEmail || 'Authenticated user' }}
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

const props = defineProps<{
  userEmail?: string | null;
  mobileOpen?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const route = useRoute();

const items = [
  { name: 'dashboard', label: 'Dashboard', to: '/', emoji: '📊' },
  { name: 'family-list', label: 'Family', to: '/families', emoji: '👨‍👩‍👧‍👦' },
  { name: 'shopping-list', label: 'Shopping Lists', to: '/families', emoji: '🛒' },
  { name: 'wishlist-list', label: 'Wishlists', to: '/wishlists', emoji: '🎁' },
  { name: 'settings', label: 'Settings', to: '/settings', emoji: '⚙️' },
];

const userEmail = props.userEmail;
const mobileOpen = computed(() => props.mobileOpen ?? false);
</script>
