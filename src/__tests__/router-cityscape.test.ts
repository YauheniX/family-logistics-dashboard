import { describe, it, expect, beforeEach } from 'vitest';
import router from '@/router';

describe('Router - Cityscape Route', () => {
  beforeEach(() => {
    // Reset router to initial state
    router.push('/');
  });

  describe('Route Configuration', () => {
    it('has a route for /apps/cityscape', () => {
      const route = router.resolve('/apps/cityscape');
      expect(route.name).toBe('cityscape');
      expect(route.matched.length).toBeGreaterThan(0);
    });

    it('cityscape route has correct path', () => {
      const route = router.getRoutes().find((r) => r.name === 'cityscape');
      expect(route).toBeDefined();
      expect(route?.path).toBe('/apps/cityscape');
    });

    it('cityscape route has correct name', () => {
      const route = router.resolve({ name: 'cityscape' });
      expect(route.name).toBe('cityscape');
      expect(route.path).toBe('/apps/cityscape');
    });

    it('cityscape route requires authentication', () => {
      const route = router.getRoutes().find((r) => r.name === 'cityscape');
      expect(route).toBeDefined();
      expect(route?.meta.requiresAuth).toBe(true);
    });

    it('cityscape route loads CityscapeView component', () => {
      const route = router.getRoutes().find((r) => r.name === 'cityscape');
      expect(route).toBeDefined();
      expect(route?.components?.default).toBeDefined();
      // Verify component is loaded (checking it exists is sufficient)
    });
  });

  describe('Navigation to Cityscape', () => {
    it('can navigate to cityscape by path', async () => {
      await router.push('/apps/cityscape');
      expect(router.currentRoute.value.name).toBe('cityscape');
      expect(router.currentRoute.value.path).toBe('/apps/cityscape');
    });

    it('can navigate to cityscape by name', async () => {
      await router.push({ name: 'cityscape' });
      expect(router.currentRoute.value.name).toBe('cityscape');
      expect(router.currentRoute.value.path).toBe('/apps/cityscape');
    });

    it('can navigate from apps to cityscape', async () => {
      await router.push('/apps');
      expect(router.currentRoute.value.name).toBe('apps');

      await router.push('/apps/cityscape');
      expect(router.currentRoute.value.name).toBe('cityscape');
    });

    it('cityscape route is reachable', () => {
      const route = router.resolve('/apps/cityscape');
      expect(route.matched.length).toBeGreaterThan(0);
      expect(route.name).toBe('cityscape');
    });
  });

  describe('Apps Routes Group', () => {
    it('has apps index route', () => {
      const route = router.getRoutes().find((r) => r.name === 'apps');
      expect(route).toBeDefined();
      expect(route?.path).toBe('/apps');
    });

    it('has rock-paper-scissors route', () => {
      const route = router.getRoutes().find((r) => r.name === 'rock-paper-scissors');
      expect(route).toBeDefined();
      expect(route?.path).toBe('/apps/rock-paper-scissors');
    });

    it('has cityscape route', () => {
      const route = router.getRoutes().find((r) => r.name === 'cityscape');
      expect(route).toBeDefined();
      expect(route?.path).toBe('/apps/cityscape');
    });

    it('all app routes require authentication', () => {
      const appRoutes = router.getRoutes().filter((r) => r.path.startsWith('/apps'));

      appRoutes.forEach((route) => {
        expect(route.meta.requiresAuth).toBe(true);
      });
    });
  });

  describe('Route Meta', () => {
    it('cityscape route has requiresAuth meta', () => {
      const route = router.getRoutes().find((r) => r.name === 'cityscape');
      expect(route?.meta).toBeDefined();
      expect(route?.meta.requiresAuth).toBe(true);
    });

    it('cityscape route does not have guestOnly meta', () => {
      const route = router.getRoutes().find((r) => r.name === 'cityscape');
      expect(route?.meta.guestOnly).toBeUndefined();
    });
  });

  describe('Wildcard and Fallback', () => {
    it('invalid apps routes redirect to dashboard', async () => {
      await router.push('/apps/nonexistent');
      // Should match the catch-all route which redirects to dashboard
      await router.isReady();
      expect(router.currentRoute.value.name).toBe('dashboard');
    });
  });

  describe('Route Resolution', () => {
    it('resolves cityscape route correctly', () => {
      const resolved = router.resolve({ name: 'cityscape' });
      expect(resolved.name).toBe('cityscape');
      expect(resolved.path).toBe('/apps/cityscape');
      expect(resolved.href).toContain('/apps/cityscape');
    });

    it('resolves cityscape path correctly', () => {
      const resolved = router.resolve('/apps/cityscape');
      expect(resolved.name).toBe('cityscape');
      expect(resolved.matched.length).toBeGreaterThan(0);
    });
  });

  describe('Route Ordering', () => {
    it('cityscape route appears after rock-paper-scissors', () => {
      const routes = router.getRoutes();
      const rpsIndex = routes.findIndex((r) => r.name === 'rock-paper-scissors');
      const cityscapeIndex = routes.findIndex((r) => r.name === 'cityscape');

      expect(rpsIndex).toBeGreaterThan(-1);
      expect(cityscapeIndex).toBeGreaterThan(-1);
      expect(cityscapeIndex).toBeGreaterThan(rpsIndex);
    });

    it('cityscape route appears after apps index', () => {
      const routes = router.getRoutes();
      const appsIndex = routes.findIndex((r) => r.name === 'apps');
      const cityscapeIndex = routes.findIndex((r) => r.name === 'cityscape');

      expect(appsIndex).toBeGreaterThan(-1);
      expect(cityscapeIndex).toBeGreaterThan(-1);
      expect(cityscapeIndex).toBeGreaterThan(appsIndex);
    });
  });
});
