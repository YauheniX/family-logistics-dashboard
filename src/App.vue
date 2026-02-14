<template>
  <div class="min-h-screen bg-white dark:bg-dark-bg text-neutral-900 dark:text-neutral-50">
    <div class="flex min-h-screen">
      <SidebarNav
        v-if="showShell"
        :user-email="authStore.user?.email"
        :mobile-open="mobileNavOpen"
        @close="mobileNavOpen = false"
      />

      <main class="flex-1">
        <header
          v-if="showShell"
          class="flex items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 md:px-6 md:py-4 md:h-16"
        >
          <div class="flex min-w-0 items-center gap-2 md:gap-3">
            <BaseButton
              variant="ghost"
              class="lg:hidden"
              aria-label="Open navigation"
              @click="mobileNavOpen = true"
            >
              ☰
            </BaseButton>
            <h1
              class="truncate text-lg font-semibold text-neutral-900 dark:text-neutral-50 md:text-h2"
            >
              {{ pageTitle }}
            </h1>
          </div>
          <div class="flex items-center gap-2 md:gap-3">
            <div class="hidden sm:block">
              <ThemeToggle />
            </div>
            <div
              class="flex items-center gap-2 border-l border-neutral-200 dark:border-neutral-700 pl-2 md:gap-3 md:pl-3"
            >
              <div class="hidden md:block text-right">
                <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {{ authStore.user?.email }}
                </p>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">Signed in</p>
              </div>
              <BaseButton variant="ghost" @click="logout">Logout</BaseButton>
            </div>
          </div>
        </header>

        <section class="p-6">
          <RouterView />
        </section>
      </main>
    </div>

    <!-- Global Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import SidebarNav from '@/components/layout/SidebarNav.vue';
import ToastContainer from '@/components/shared/ToastContainer.vue';
import ThemeToggle from '@/components/shared/ThemeToggle.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/composables/useTheme';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const { initTheme } = useTheme();
const mobileNavOpen = ref(false);

// Initialize theme
initTheme();

const showShell = computed(() => Boolean(route.meta.requiresAuth));

watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false;
  },
);

const pageTitle = computed(() => {
  const routeName = route.name as string;
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    'family-list': 'Families',
    'family-detail': 'Family Details',
    'shopping-list': 'Shopping List',
    'wishlist-list': 'Wishlists',
    'wishlist-edit': 'My Wishlist',
    'public-wishlist': 'Public Wishlist',
    settings: 'Settings',
  };
  return titles[routeName] || 'Family Logistics';
});

const logout = async () => {
  await authStore.logout();
  router.push({ name: 'login' });
};
</script>
