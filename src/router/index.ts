import { createRouter, createWebHashHistory } from 'vue-router';
import DashboardView from '@/views/DashboardView.vue';
import FamilyListView from '@/views/FamilyListView.vue';
import FamilyDetailView from '@/views/FamilyDetailView.vue';
import ShoppingListView from '@/views/ShoppingListView.vue';
import WishlistListView from '@/views/WishlistListView.vue';
import WishlistEditView from '@/views/WishlistEditView.vue';
import PublicWishlistView from '@/views/PublicWishlistView.vue';
import LoginView from '@/views/auth/LoginView.vue';
import RegisterView from '@/views/auth/RegisterView.vue';
import SettingsView from '@/views/SettingsView.vue';
import NavigationDemoView from '@/views/NavigationDemoView.vue';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/demo',
      name: 'navigation-demo',
      component: NavigationDemoView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { guestOnly: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/families',
      name: 'family-list',
      component: FamilyListView,
      meta: { requiresAuth: true },
    },
    {
      path: '/families/:id',
      name: 'family-detail',
      component: FamilyDetailView,
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/shopping/:listId',
      name: 'shopping-list',
      component: ShoppingListView,
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/wishlists',
      name: 'wishlist-list',
      component: WishlistListView,
      meta: { requiresAuth: true },
    },
    {
      path: '/wishlists/:id',
      name: 'wishlist-edit',
      component: WishlistEditView,
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/wishlist/:shareSlug',
      name: 'public-wishlist',
      component: PublicWishlistView,
      props: true,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Ensure auth is initialized (should already be done in main.ts, but defensive)
  if (!authStore.initialized) {
    await authStore.initialize();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return next({ name: 'dashboard' });
  }

  return next();
});

export default router;
