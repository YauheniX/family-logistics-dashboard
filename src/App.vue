<template>
  <div class="min-h-screen bg-white dark:bg-dark-bg text-neutral-900 dark:text-neutral-50">
    <div class="flex min-h-screen">
      <SidebarNav
        v-if="showShell"
        :user-email="authStore.user?.email"
        :mobile-open="mobileNavOpen"
        @close="mobileNavOpen = false"
      />

      <main class="flex-1 pb-16 lg:pb-0">
        <header
          v-if="showShell"
          class="flex items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 md:px-6 md:py-4"
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

            <!-- Household Switcher (Desktop) -->
            <div class="hidden md:block">
              <HouseholdSwitcher />
            </div>

            <h1
              class="truncate text-lg font-semibold text-neutral-900 dark:text-neutral-50 md:text-xl"
            >
              {{ pageTitle }}
            </h1>
          </div>

          <div class="flex items-center gap-2 md:gap-3">
            <BaseButton
              variant="ghost"
              aria-label="Report a problem"
              class="hidden sm:inline-flex"
              @click="reportModalOpen = true"
            >
              Report a problem
            </BaseButton>
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

        <!-- Breadcrumbs -->
        <div
          v-if="showShell"
          class="px-4 py-2 md:px-6 border-b border-neutral-100 dark:border-neutral-700/50"
        >
          <Breadcrumbs />
        </div>

        <section class="p-4 md:p-6">
          <RouterView />
        </section>
      </main>
    </div>

    <!-- Mobile Bottom Navigation -->
    <BottomNav v-if="showShell" />

    <ReportProblemModal :open="reportModalOpen" @close="reportModalOpen = false" />

    <!-- Global Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import SidebarNav from '@/components/layout/SidebarNav.vue';
import BottomNav from '@/components/layout/BottomNav.vue';
import Breadcrumbs from '@/components/layout/Breadcrumbs.vue';
import HouseholdSwitcher from '@/components/layout/HouseholdSwitcher.vue';
import ToastContainer from '@/components/shared/ToastContainer.vue';
import ThemeToggle from '@/components/shared/ThemeToggle.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import ReportProblemModal from '@/components/shared/ReportProblemModal.vue';
import { useAuthStore } from '@/stores/auth';
import { useHouseholdStore } from '@/stores/household';
import { useTheme } from '@/composables/useTheme';

const authStore = useAuthStore();
const householdStore = useHouseholdStore();
const route = useRoute();
const router = useRouter();
const { initTheme } = useTheme();
const mobileNavOpen = ref(false);
const reportModalOpen = ref(false);

// Initialize theme
initTheme();

// Initialize household store (mock mode for now)
onMounted(() => {
  const userId = authStore.user?.id;
  const email = authStore.user?.email ?? null;
  if (userId) {
    householdStore.ensureDefaultHouseholdForUser(userId, email).finally(() => {
      householdStore.initializeForUser(userId);
    });
  }
});

// Watch for auth state changes to initialize households on login
watch(
  () => authStore.user?.id,
  (userId, prevUserId) => {
    if (userId && !prevUserId) {
      const email = authStore.user?.email ?? null;
      householdStore.ensureDefaultHouseholdForUser(userId, email).finally(() => {
        householdStore.initializeForUser(userId);
      });
    } else if (!userId && prevUserId) {
      // User just logged out - clear household context
      householdStore.setCurrentHousehold(null);
      householdStore.loadHouseholds([]);
    }
  },
);

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
    dashboard: 'Home',
    'household-list': 'Members',
    'household-detail': 'Household Details',
    'shopping-list': 'Shopping List',
    'wishlist-list': 'Wishlists',
    'wishlist-edit': 'My Wishlist',
    'public-wishlist': 'Public Wishlist',
    settings: 'Settings',
  };
  return titles[routeName] || 'HouseholdBoard';
});

const logout = async () => {
  await authStore.logout();
  router.push({ name: 'login' });
};
</script>
