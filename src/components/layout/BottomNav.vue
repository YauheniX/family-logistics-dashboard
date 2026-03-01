<template>
  <!-- Overlay to close more menu -->
  <div
    v-if="showMoreMenu"
    class="fixed inset-0 z-30 bg-black/20 lg:hidden transition-opacity duration-normal backdrop-blur-sm"
    aria-hidden="true"
    @click="closeMoreMenu"
  ></div>

  <!-- Mobile Bottom Navigation (visible only on mobile) -->
  <nav
    class="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md px-2 py-2 safe-area-inset-bottom mobile-nav shadow-2xl"
    role="navigation"
    aria-label="Mobile navigation"
  >
    <div class="flex items-center justify-around">
      <RouterLink
        v-for="item in navItems"
        :key="item.name"
        :to="item.to"
        class="flex flex-col items-center gap-0.5 px-1.5 sm:px-2.5 py-1 rounded-lg transition-all duration-normal min-w-0 active:scale-95 focus-ring"
        :class="
          isActive(item.name)
            ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-700'
        "
        :aria-label="item.label"
      >
        <span
          class="text-xl transition-transform"
          :class="isActive(item.name) ? 'scale-110' : ''"
          aria-hidden="true"
          >{{ item.emoji }}</span
        >
        <span class="text-[10px] sm:text-xs font-medium truncate max-w-[70px] sm:max-w-[80px]">{{
          item.label
        }}</span>
      </RouterLink>

      <!-- More Menu -->
      <button
        class="flex flex-col items-center gap-0.5 px-1.5 sm:px-2.5 py-1 rounded-lg transition-all duration-normal active:scale-95 focus-ring"
        :class="
          showMoreMenu
            ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-700'
        "
        :aria-expanded="showMoreMenu"
        aria-label="More options"
        @click="toggleMoreMenu"
      >
        <span
          class="text-xl transition-transform"
          :class="showMoreMenu ? 'rotate-90' : ''"
          aria-hidden="true"
          >⋯</span
        >
        <span class="text-[10px] sm:text-xs font-medium">{{ $t('nav.more') }}</span>
      </button>
    </div>

    <!-- More Menu Dropdown -->
    <Transition
      enter-active-class="transition duration-normal ease-out"
      enter-from-class="transform translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-fast ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-2 opacity-0"
    >
      <div
        v-if="showMoreMenu"
        class="absolute bottom-full left-0 right-0 mb-2 mx-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-xl z-50 animate-slide-up"
      >
        <div class="py-2">
          <RouterLink
            v-for="item in moreItems"
            :key="item.name"
            :to="item.to"
            class="flex items-center gap-3 px-4 py-3 transition-all duration-normal hover:bg-neutral-100 dark:hover:bg-neutral-700 active:scale-95 focus-ring"
            :class="
              isActive(item.name)
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'text-neutral-700 dark:text-neutral-300'
            "
            @click="closeMoreMenu"
          >
            <span class="text-lg transition-transform hover:scale-110" aria-hidden="true">{{
              item.emoji
            }}</span>
            <span class="text-sm font-medium">{{ item.label }}</span>
          </RouterLink>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const route = useRoute();
const showMoreMenu = ref(false);

interface NavItem {
  name: string;
  label: string;
  to: string | { name: string };
  emoji: string;
}

// Primary navigation items (always visible)
const navItems = computed<NavItem[]>(() => [
  { name: 'dashboard', label: t('nav.home'), to: { name: 'dashboard' }, emoji: '🏠' },
  { name: 'shopping', label: t('nav.shopping'), to: { name: 'shopping' }, emoji: '🛒' },
  { name: 'wishlist-list', label: t('nav.wishlists'), to: '/wishlists', emoji: '🎁' },
]);

// Additional items in "More" menu
const moreItems = computed<NavItem[]>(() => [
  { name: 'household-list', label: t('nav.households'), to: '/households', emoji: '🏠' },
  { name: 'apps', label: t('nav.apps'), to: '/apps', emoji: '📱' },
  { name: 'settings', label: t('nav.settings'), to: '/settings', emoji: '⚙️' },
]);

function isActive(routeName: string): boolean {
  const currentRouteName = route.name as string;

  // Match related routes for navigation items
  if (routeName === 'household-list') {
    return currentRouteName?.startsWith('household') || currentRouteName === 'member-management';
  }
  if (routeName === 'shopping') {
    return currentRouteName?.startsWith('shopping');
  }
  if (routeName === 'wishlist-list') {
    return currentRouteName?.startsWith('wishlist');
  }

  return currentRouteName === routeName;
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

/* Ensure nav stays fixed on mobile devices */
.mobile-nav {
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  will-change: transform;
}
</style>
