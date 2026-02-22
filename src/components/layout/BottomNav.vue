<template>
  <!-- Overlay to close more menu -->
  <div
    v-if="showMoreMenu"
    class="fixed inset-0 z-30 bg-black/20 lg:hidden"
    aria-hidden="true"
    @click="closeMoreMenu"
  ></div>

  <!-- Mobile Bottom Navigation (visible only on mobile) -->
  <nav
    class="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-2 safe-area-inset-bottom"
    role="navigation"
    aria-label="Mobile navigation"
  >
    <div class="flex items-center justify-around">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-0.5 px-1.5 sm:px-2.5 py-1 rounded-lg transition-colors min-w-0"
        :class="
          isActive(item.name)
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50'
        "
        :aria-label="item.label"
      >
        <span class="text-xl" aria-hidden="true">{{ item.emoji }}</span>
        <span class="text-[10px] sm:text-xs font-medium truncate max-w-[70px] sm:max-w-[80px]">{{
          item.label
        }}</span>
      </RouterLink>

      <!-- More Menu -->
      <button
        class="flex flex-col items-center gap-0.5 px-1.5 sm:px-2.5 py-1 rounded-lg transition-colors"
        :class="
          showMoreMenu
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50'
        "
        :aria-expanded="showMoreMenu"
        aria-label="More options"
        @click="toggleMoreMenu"
      >
        <span class="text-xl" aria-hidden="true">⋯</span>
        <span class="text-[10px] sm:text-xs font-medium">More</span>
      </button>
    </div>

    <!-- More Menu Dropdown -->
    <div
      v-if="showMoreMenu"
      class="absolute bottom-full left-0 right-0 mb-2 mx-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg z-50"
    >
      <div class="py-2">
        <RouterLink
          v-for="item in moreItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
          :class="
            isActive(item.name)
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
              : 'text-neutral-700 dark:text-neutral-300'
          "
          @click="closeMoreMenu"
        >
          <span class="text-lg" aria-hidden="true">{{ item.emoji }}</span>
          <span class="text-sm font-medium">{{ item.label }}</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useHouseholdStore } from '@/stores/household';

const route = useRoute();
const householdStore = useHouseholdStore();
const currentHousehold = computed(() => householdStore.currentHousehold);
const showMoreMenu = ref(false);

interface NavItem {
  name: string;
  label: string;
  to: string | { name: string };
  emoji: string;
}

// Primary navigation items (always visible)
const navItems = computed<NavItem[]>(() => [
  { name: 'dashboard', label: 'Home', to: '/', emoji: '🏠' },
  {
    name: 'household-list',
    label: 'Manage',
    to: currentHousehold.value ? `/households/${currentHousehold.value.id}` : '/households',
    emoji: '👥',
  },
  { name: 'shopping', label: 'Shopping', to: { name: 'shopping' }, emoji: '🛒' },
  { name: 'wishlist-list', label: 'Wishlists', to: '/wishlists', emoji: '🎁' },
]);

// Additional items in "More" menu
const moreItems: NavItem[] = [
  { name: 'settings', label: 'Settings', to: '/settings', emoji: '⚙️' },
];

function isActive(routeName: string): boolean {
  return route.name === routeName;
}

function toggleMoreMenu() {
  showMoreMenu.value = !showMoreMenu.value;
}

function closeMoreMenu() {
  showMoreMenu.value = false;
}
</script>

<style scoped>
/* Support for safe area insets (iPhone notch, etc.) */
.safe-area-inset-bottom {
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}
</style>
