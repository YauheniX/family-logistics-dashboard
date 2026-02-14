<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <div class="flex min-h-screen">
      <SidebarNav v-if="showShell" :user-email="authStore.user?.email" />

      <main class="flex-1">
        <header
          v-if="showShell"
          class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur"
        >
          <div>
            <p class="text-sm text-slate-500">Family Shopping & Wishlist Planner</p>
            <h1 class="text-xl font-semibold text-slate-900">Plan, shop, and share wishlists</h1>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <p class="text-sm font-semibold text-slate-800">{{ authStore.user?.email }}</p>
              <p class="text-xs text-slate-500">Signed in</p>
            </div>
            <button class="btn-ghost" type="button" @click="logout">Logout</button>
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
import { computed } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import SidebarNav from '@/components/layout/SidebarNav.vue';
import ToastContainer from '@/components/shared/ToastContainer.vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const showShell = computed(() => Boolean(route.meta.requiresAuth));

const logout = async () => {
  await authStore.logout();
  router.push({ name: 'login' });
};
</script>
