import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/features/auth/presentation/auth.store';

// Mock Vue components
vi.mock('@/views/DashboardView.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/FamilyListView.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/FamilyDetailView.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/ShoppingListView.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/WishlistListView.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/WishlistEditView.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/PublicWishlistView.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/views/auth/LoginView.vue', () => ({ default: { template: '<div />' } }));

// Mock auth service to prevent Supabase calls
vi.mock('@/features/auth', () => ({
  authService: {
    getCurrentUser: vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'Not authenticated' } }),
    onAuthStateChange: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
  AuthService: vi.fn(),
}));

vi.mock('@/features/shared/infrastructure/supabase.client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

function createTestRouter() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/login',
        name: 'login',
        component: { template: '<div />' },
        meta: { guestOnly: true },
      },
      {
        path: '/',
        name: 'dashboard',
        component: { template: '<div />' },
        meta: { requiresAuth: true },
      },
      {
        path: '/families',
        name: 'family-list',
        component: { template: '<div />' },
        meta: { requiresAuth: true },
      },
    ],
  });

  router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore();

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return next({ name: 'login', query: { redirect: to.fullPath } });
    }

    if (to.meta.guestOnly && authStore.isAuthenticated) {
      return next({ name: 'dashboard' });
    }

    return next();
  });

  return router;
}

describe('Auth Guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('redirects unauthenticated user to login for protected routes', async () => {
    const authStore = useAuthStore();
    authStore.initialized = true;
    authStore.user = null;

    const router = createTestRouter();
    router.push('/');
    await router.isReady();

    expect(router.currentRoute.value.name).toBe('login');
  });

  it('includes redirect query param when redirecting to login', async () => {
    const authStore = useAuthStore();
    authStore.initialized = true;
    authStore.user = null;

    const router = createTestRouter();
    router.push('/families');
    await router.isReady();

    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/families');
  });

  it('allows authenticated user to access protected routes', async () => {
    const authStore = useAuthStore();
    authStore.initialized = true;
    authStore.user = { id: 'user-1', email: 'test@test.com' };

    const router = createTestRouter();
    router.push('/');
    await router.isReady();

    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('redirects authenticated user away from login page', async () => {
    const authStore = useAuthStore();
    authStore.initialized = true;
    authStore.user = { id: 'user-1', email: 'test@test.com' };

    const router = createTestRouter();
    router.push('/login');
    await router.isReady();

    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('allows unauthenticated user to access login page', async () => {
    const authStore = useAuthStore();
    authStore.initialized = true;
    authStore.user = null;

    const router = createTestRouter();
    router.push('/login');
    await router.isReady();

    expect(router.currentRoute.value.name).toBe('login');
  });
});
