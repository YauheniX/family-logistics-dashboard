import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('Router');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/demo',
      name: 'navigation-demo',
      component: () => import('@/views/NavigationDemoView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/households',
      name: 'household-list',
      component: () => import('@/views/HouseholdListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/households/:id',
      name: 'household-detail',
      component: () => import('@/views/HouseholdDetailView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/households/:id/members',
      name: 'member-management',
      component: () => import('@/views/MemberManagementView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/shopping',
      name: 'shopping',
      component: () => import('@/views/ShoppingIndexView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/shopping/:listId',
      name: 'shopping-list',
      component: () => import('@/views/ShoppingListView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/wishlists',
      name: 'wishlist-list',
      component: () => import('@/views/WishlistListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/wishlists/:id/edit',
      name: 'wishlist-edit',
      component: () => import('@/views/WishlistEditView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/wishlists/:id',
      name: 'wishlist-detail',
      component: () => import('@/views/WishlistEditView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/wishlist/:shareSlug',
      name: 'public-wishlist',
      component: () => import('@/views/PublicWishlistView.vue'),
      props: true,
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/apps',
      name: 'apps',
      component: () => import('@/views/AppsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/apps/rock-paper-scissors',
      name: 'rock-paper-scissors',
      component: () => import('@/views/RockPaperScissorsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/school',
      name: 'school',
      component: () => import('@/views/SchoolView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: { name: 'dashboard' },
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
    logger.debug('Redirecting unauthenticated user to login', { from: to.fullPath });
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    logger.debug('Redirecting authenticated user away from guest-only route', {
      from: to.fullPath,
    });
    return next({ name: 'dashboard' });
  }

  return next();
});

export default router;
