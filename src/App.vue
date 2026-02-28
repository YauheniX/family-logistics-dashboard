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
          class="flex items-center justify-between gap-2 sm:gap-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 sm:px-4 py-2.5 sm:py-3 md:px-6 md:py-4 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95 sticky top-0 z-40 shadow-soft"
        >
          <div class="flex min-w-0 items-center gap-2 md:gap-3 flex-1">
            <!-- Logo -->
            <RouterLink
              to="/"
              class="flex-shrink-0 focus-ring transition-transform hover:scale-105 active:scale-95"
              aria-label="Go to home"
            >
              <img src="/icon.svg" alt="Logo" class="h-16 w-16" />
            </RouterLink>

            <HouseholdSwitcher />
          </div>

          <div class="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            <BaseButton
              variant="ghost"
              aria-label="Report a problem"
              class="hidden sm:inline-flex hover:shadow-soft"
              @click="reportModalOpen = true"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                />
              </svg>
            </BaseButton>
            <div class="hidden sm:block">
              <ThemeToggle />
            </div>
            <div
              class="flex items-center gap-1.5 sm:gap-2 border-l border-neutral-200 dark:border-neutral-700 pl-1.5 sm:pl-2 md:gap-3 md:pl-3"
            >
              <div class="hidden md:block text-right">
                <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {{ displayNameOrEmail }}
                </p>
              </div>
              <!-- User Avatar -->
              <Avatar
                :avatar-url="userAvatarUrl"
                :name="displayNameOrEmail"
                :size="32"
                :show-role-badge="false"
                class="ring-2 ring-transparent hover:ring-primary-500/20 transition-all duration-normal"
              />

              <BaseButton variant="ghost" class="text-sm px-2 sm:px-3" @click="logout"
                >Logout</BaseButton
              >
            </div>
          </div>
        </header>

        <!-- Breadcrumbs -->
        <div
          v-if="showShell"
          class="px-4 py-2 md:px-6 border-b border-neutral-100 dark:border-neutral-700/50 bg-neutral-50/50 dark:bg-neutral-900/50"
        >
          <Breadcrumbs />
        </div>

        <section class="p-3 sm:p-4 md:p-6 animate-fade-in">
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
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router';
import SidebarNav from '@/components/layout/SidebarNav.vue';
import BottomNav from '@/components/layout/BottomNav.vue';
import Breadcrumbs from '@/components/layout/Breadcrumbs.vue';
import HouseholdSwitcher from '@/components/layout/HouseholdSwitcher.vue';
import ToastContainer from '@/components/shared/ToastContainer.vue';
import ThemeToggle from '@/components/shared/ThemeToggle.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import ReportProblemModal from '@/components/shared/ReportProblemModal.vue';
import Avatar from '@/components/shared/Avatar.vue';
import { useAuthStore } from '@/stores/auth';
import { useHouseholdStore } from '@/stores/household';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';
import { useTheme } from '@/composables/useTheme';
import { useUserProfile } from '@/composables/useUserProfile';
import { resolveUserProfile } from '@/utils/profileResolver';

const authStore = useAuthStore();
const householdStore = useHouseholdStore();
const shoppingStore = useShoppingStore();
const wishlistStore = useWishlistStore();
const route = useRoute();
const router = useRouter();
const { initTheme } = useTheme();
const {
  userDisplayName,
  userAvatarUrl: profileAvatarUrl,
  loadUserProfile,
  clearUserProfile,
} = useUserProfile();
const mobileNavOpen = ref(false);
const reportModalOpen = ref(false);

// Initialize theme
initTheme();

// Initialize household store (mock mode for now)
onMounted(() => {
  console.log('[App.vue] onMounted - authStore.user:', authStore.user);
  const userId = authStore.user?.id;
  const email = authStore.user?.email ?? null;
  if (userId) {
    console.log('[App.vue] onMounted - Loading user profile for:', userId);
    loadUserProfile(userId);
    householdStore.ensureDefaultHouseholdForUser(userId, email).finally(() => {
      // Guard: only proceed if same user is still logged in
      if (authStore.user?.id === userId) {
        householdStore.initializeForUser(userId);
      }
    });
  }
});

// Watch for auth state changes to initialize households on login
watch(
  () => authStore.user?.id,
  (userId, prevUserId) => {
    console.log('[App.vue] watch authStore.user.id changed:', { userId, prevUserId });
    if (userId && !prevUserId) {
      const email = authStore.user?.email ?? null;
      console.log('[App.vue] watch - Loading user profile for:', userId);
      loadUserProfile(userId);
      householdStore.ensureDefaultHouseholdForUser(userId, email).finally(() => {
        // Guard: only proceed if same user is still logged in
        if (authStore.user?.id === userId) {
          householdStore.initializeForUser(userId);
        }
      });
    } else if (!userId && prevUserId) {
      // User just logged out - clear ALL store state to prevent data leakage
      console.log('[App.vue] watch - User logged out, clearing all stores');
      clearUserProfile();
      householdStore.$reset();
      shoppingStore.$reset();
      wishlistStore.$reset();
    }
  },
);

const showShell = computed(() => Boolean(route.meta.requiresAuth));

// Resolve user profile with consistent fallback logic
const resolvedProfile = computed(() => {
  return resolveUserProfile(
    {
      display_name: userDisplayName.value,
      avatar_url: profileAvatarUrl.value,
    },
    authStore.user,
    authStore.user?.email,
  );
});

const userAvatarUrl = computed(() => resolvedProfile.value.avatar);
const displayNameOrEmail = computed(() => resolvedProfile.value.name);

watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false;
  },
);

const logout = async () => {
  await authStore.logout();
  router.push({ name: 'login' });
};
</script>
