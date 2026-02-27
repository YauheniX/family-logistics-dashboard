import { describe, it, expect, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import Breadcrumbs from '@/components/layout/Breadcrumbs.vue';
import { setActivePinia, createPinia } from 'pinia';

describe('Breadcrumbs - Cityscape Route', () => {
  let router: ReturnType<typeof createRouter>;
  let wrapper: VueWrapper;

  beforeEach(async () => {
    setActivePinia(createPinia());

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'dashboard', component: { template: '<div />' } },
        { path: '/apps', name: 'apps', component: { template: '<div />' } },
        {
          path: '/apps/rock-paper-scissors',
          name: 'rock-paper-scissors',
          component: { template: '<div />' },
        },
        { path: '/apps/cityscape', name: 'cityscape', component: { template: '<div />' } },
      ],
    });

    await router.push('/');
    await router.isReady();
  });

  const mountBreadcrumbs = async () => {
    wrapper = mount(Breadcrumbs, {
      global: {
        plugins: [router],
        stubs: {
          RouterLink: false,
        },
      },
    });
    await wrapper.vm.$nextTick();
    return wrapper;
  };

  describe('Cityscape Breadcrumb Trail', () => {
    it('shows "Home > Apps > Cityscape" on cityscape route', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(links.length).toBe(3);

      expect(links[0].text()).toBe('Home');
      expect(links[0].attributes('to')).toBe('/');

      expect(links[1].text()).toBe('Apps');
      expect(links[1].attributes('to')).toBe('/apps');

      expect(links[2].text()).toBe('Cityscape');
      expect(links[2].attributes('to')).toBe('/apps/cityscape');
    });

    it('renders breadcrumb navigation on cityscape route', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const nav = wrapper.find('nav[aria-label="Breadcrumb"]');
      expect(nav.exists()).toBe(true);
    });

    it('has correct number of separators on cityscape route', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      // Should have 2 arrows (between 3 crumbs)
      const arrows = wrapper.findAll('svg');
      expect(arrows.length).toBe(2);
    });

    it('marks last crumb as current page on cityscape route', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      const lastLink = links[links.length - 1];

      expect(lastLink.attributes('aria-current')).toBe('page');
    });

    it('does not mark intermediate crumbs as current page', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });

      // Home and Apps should not have aria-current
      expect(links[0].attributes('aria-current')).toBeUndefined();
      expect(links[1].attributes('aria-current')).toBeUndefined();
    });
  });

  describe('Apps Section Breadcrumbs', () => {
    it('shows "Home > Apps" on apps index route', async () => {
      await router.push('/apps');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(links.length).toBe(2);

      expect(links[0].text()).toBe('Home');
      expect(links[1].text()).toBe('Apps');
    });

    it('shows "Home > Apps > Rock-Paper-Scissors" on RPS route', async () => {
      await router.push('/apps/rock-paper-scissors');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(links.length).toBe(3);

      expect(links[0].text()).toBe('Home');
      expect(links[1].text()).toBe('Apps');
      expect(links[2].text()).toBe('Rock-Paper-Scissors');
    });

    it('shows "Home > Apps > Cityscape" on cityscape route', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(links.length).toBe(3);

      expect(links[2].text()).toBe('Cityscape');
    });
  });

  describe('Navigation Links', () => {
    it('Home link navigates to /', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(links[0].attributes('to')).toBe('/');
    });

    it('Apps link navigates to /apps', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(links[1].attributes('to')).toBe('/apps');
    });

    it('Cityscape link navigates to current route path', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(links[2].attributes('to')).toBe('/apps/cityscape');
    });
  });

  describe('Breadcrumb Styling', () => {
    it('applies active styling to last breadcrumb', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      const lastSpan = links[links.length - 1].find('span');

      expect(lastSpan.classes()).toContain('font-medium');
      expect(lastSpan.classes()).toContain('text-neutral-900');
    });

    it('applies inactive styling to intermediate breadcrumbs', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      const firstSpan = links[0].find('span');

      expect(firstSpan.classes()).toContain('text-neutral-500');
    });

    it('has dark mode classes', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      const lastSpan = links[links.length - 1].find('span');

      expect(lastSpan.classes()).toContain('dark:text-neutral-50');
    });

    it('separators have correct styling', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const arrows = wrapper.findAll('svg');
      expect(arrows[0].classes()).toContain('text-neutral-400');
      expect(arrows[0].classes()).toContain('dark:text-neutral-500');
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label on nav element', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const nav = wrapper.find('nav');
      expect(nav.attributes('aria-label')).toBe('Breadcrumb');
    });

    it('separators are hidden from screen readers', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const arrows = wrapper.findAll('svg');
      arrows.forEach((arrow) => {
        expect(arrow.attributes('aria-hidden')).toBe('true');
      });
    });

    it('uses semantic nav element', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      expect(wrapper.find('nav').exists()).toBe(true);
    });

    it('all breadcrumbs are links', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(links.length).toBeGreaterThan(0);

      links.forEach((link) => {
        expect(link.exists()).toBe(true);
      });
    });
  });

  describe('Dashboard Route', () => {
    it('shows only Home on dashboard route', async () => {
      await router.push('/');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(links.length).toBe(1);
      expect(links[0].text()).toBe('Home');
    });

    it('does not show arrows on dashboard', async () => {
      await router.push('/');
      const wrapper = await mountBreadcrumbs();

      const arrows = wrapper.findAll('svg');
      expect(arrows.length).toBe(0);
    });
  });

  describe('Route Transitions', () => {
    it('updates breadcrumbs when navigating from apps to cityscape', async () => {
      await router.push('/apps');
      const wrapper = await mountBreadcrumbs();

      let links = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(links.length).toBe(2);
      expect(links[1].text()).toBe('Apps');

      await router.push('/apps/cityscape');
      await wrapper.vm.$nextTick();

      links = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(links.length).toBe(3);
      expect(links[2].text()).toBe('Cityscape');
    });

    it('updates breadcrumbs when navigating from cityscape to RPS', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      let links = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(links[2].text()).toBe('Cityscape');

      await router.push('/apps/rock-paper-scissors');
      await wrapper.vm.$nextTick();

      links = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(links[2].text()).toBe('Rock-Paper-Scissors');
    });
  });

  describe('Breadcrumb Structure', () => {
    it('uses flex layout', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const nav = wrapper.find('nav');
      expect(nav.classes()).toContain('flex');
      expect(nav.classes()).toContain('items-center');
      expect(nav.classes()).toContain('gap-2');
    });

    it('has consistent text size', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const nav = wrapper.find('nav');
      expect(nav.classes()).toContain('text-sm');
    });

    it('wraps each crumb in RouterLink', async () => {
      await router.push('/apps/cityscape');
      const wrapper = await mountBreadcrumbs();

      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      links.forEach((link) => {
        expect(link.classes()).toContain('flex');
        expect(link.classes()).toContain('items-center');
        expect(link.classes()).toContain('gap-2');
      });
    });
  });
});
