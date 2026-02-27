import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import AppsView from '@/views/AppsView.vue';

describe('AppsView', () => {
  const createRouterInstance = () => {
    return createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/apps', component: { template: '<div />' } },
        { path: '/apps/rock-paper-scissors', component: { template: '<div />' } },
        { path: '/apps/cityscape', component: { template: '<div />' } },
      ],
    });
  };

  const mountAppsView = () => {
    const router = createRouterInstance();
    return mount(AppsView, {
      global: {
        plugins: [router],
        stubs: {
          RouterLink: false,
        },
      },
    });
  };

  describe('Initial Render', () => {
    it('renders the apps view container', () => {
      const wrapper = mountAppsView();
      expect(wrapper.find('.min-h-screen').exists()).toBe(true);
    });

    it('renders the apps grid', () => {
      const wrapper = mountAppsView();
      expect(wrapper.find('.grid').exists()).toBe(true);
    });

    it('has responsive grid classes', () => {
      const wrapper = mountAppsView();
      const grid = wrapper.find('.grid');
      expect(grid.classes()).toContain('sm:grid-cols-2');
      expect(grid.classes()).toContain('lg:grid-cols-3');
    });
  });

  describe('App Tiles', () => {
    it('renders Rock-Paper-Scissors tile', () => {
      const wrapper = mountAppsView();
      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      const rpsLink = links.find((link) => link.props('to') === '/apps/rock-paper-scissors');
      expect(rpsLink).toBeDefined();
      expect(rpsLink?.text()).toContain('Rock-Paper-Scissors');
      expect(rpsLink?.text()).toContain('Play the classic game');
    });

    it('Rock-Paper-Scissors tile has correct emoji', () => {
      const wrapper = mountAppsView();
      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      const rpsLink = links.find((link) => link.props('to') === '/apps/rock-paper-scissors');
      expect(rpsLink?.html()).toContain('✊✋✌️');
    });

    it('renders Cityscape tile', () => {
      const wrapper = mountAppsView();
      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      const cityscapeLink = links.find((link) => link.props('to') === '/apps/cityscape');
      expect(cityscapeLink).toBeDefined();
      expect(cityscapeLink?.text()).toContain('Cityscape');
      expect(cityscapeLink?.text()).toContain('Interactive animated city scene');
    });

    it('Cityscape tile has correct emoji', () => {
      const wrapper = mountAppsView();
      const links = wrapper.findAllComponents({ name: 'RouterLink' });
      const cityscapeLink = links.find((link) => link.props('to') === '/apps/cityscape');
      expect(cityscapeLink?.html()).toContain('🏙️');
    });

    it('renders Coming Soon placeholder', () => {
      const wrapper = mountAppsView();
      const comingSoon = wrapper.find('.border-dashed');
      expect(comingSoon.exists()).toBe(true);
      expect(comingSoon.text()).toContain('Coming Soon');
      expect(comingSoon.text()).toContain('More apps coming soon');
    });

    it('Coming Soon has correct emoji', () => {
      const wrapper = mountAppsView();
      const comingSoon = wrapper.find('.border-dashed');
      expect(comingSoon.html()).toContain('📱');
    });
  });

  describe('Tile Styling', () => {
    it('Rock-Paper-Scissors tile has hover classes', () => {
      const wrapper = mountAppsView();
      const rpsLink = wrapper.find('[to="/apps/rock-paper-scissors"]');
      expect(rpsLink.classes()).toContain('hover:shadow-lg');
      expect(rpsLink.classes()).toContain('hover:border-primary-500');
      expect(rpsLink.classes()).toContain('cursor-pointer');
    });

    it('Cityscape tile has hover classes', () => {
      const wrapper = mountAppsView();
      const cityscapeLink = wrapper.find('[to="/apps/cityscape"]');
      expect(cityscapeLink.classes()).toContain('hover:shadow-lg');
      expect(cityscapeLink.classes()).toContain('hover:border-primary-500');
      expect(cityscapeLink.classes()).toContain('cursor-pointer');
    });

    it('app tiles have consistent styling', () => {
      const wrapper = mountAppsView();
      const rpsLink = wrapper.find('[to="/apps/rock-paper-scissors"]');
      const cityscapeLink = wrapper.find('[to="/apps/cityscape"]');

      // Both should have the same base classes
      const sharedClasses = ['rounded-lg', 'p-8', 'text-center', 'transition-all'];
      sharedClasses.forEach((className) => {
        expect(rpsLink.classes()).toContain(className);
        expect(cityscapeLink.classes()).toContain(className);
      });
    });

    it('Coming Soon tile has dashed border', () => {
      const wrapper = mountAppsView();
      const comingSoon = wrapper.find('.border-dashed');
      expect(comingSoon.classes()).toContain('border-2');
      expect(comingSoon.classes()).toContain('border-dashed');
    });
  });

  describe('Navigation Links', () => {
    it('Rock-Paper-Scissors tile links to correct route', () => {
      const wrapper = mountAppsView();
      const rpsLink = wrapper.find('[to="/apps/rock-paper-scissors"]');
      expect(rpsLink.attributes('to')).toBe('/apps/rock-paper-scissors');
    });

    it('Cityscape tile links to correct route', () => {
      const wrapper = mountAppsView();
      const cityscapeLink = wrapper.find('[to="/apps/cityscape"]');
      expect(cityscapeLink.attributes('to')).toBe('/apps/cityscape');
    });

    it('renders correct number of RouterLinks', () => {
      const wrapper = mountAppsView();
      const routerLinks = wrapper.findAllComponents({ name: 'RouterLink' });
      expect(routerLinks.length).toBe(2); // RPS and Cityscape
    });
  });

  describe('Dark Mode Support', () => {
    it('has dark mode classes on container', () => {
      const wrapper = mountAppsView();
      const container = wrapper.find('.min-h-screen');
      expect(container.classes()).toContain('dark:bg-dark-bg');
    });

    it('app tiles have dark mode border classes', () => {
      const wrapper = mountAppsView();
      const rpsLink = wrapper.find('[to="/apps/rock-paper-scissors"]');
      expect(rpsLink.classes()).toContain('dark:border-neutral-700');
      expect(rpsLink.classes()).toContain('dark:bg-neutral-800');
    });

    it('app tiles have dark mode hover classes', () => {
      const wrapper = mountAppsView();
      const cityscapeLink = wrapper.find('[to="/apps/cityscape"]');
      expect(cityscapeLink.classes()).toContain('dark:hover:border-primary-500');
    });

    it('app tile text has dark mode classes', () => {
      const wrapper = mountAppsView();
      const title = wrapper.find('h3');
      expect(title.classes()).toContain('dark:text-neutral-50');
    });
  });

  describe('Responsive Design', () => {
    it('has mobile padding classes', () => {
      const wrapper = mountAppsView();
      const innerContainer = wrapper.find('.mx-auto');
      expect(innerContainer.classes()).toContain('px-4');
      expect(innerContainer.classes()).toContain('py-6');
    });

    it('has tablet padding classes', () => {
      const wrapper = mountAppsView();
      const innerContainer = wrapper.find('.mx-auto');
      expect(innerContainer.classes()).toContain('sm:px-6');
    });

    it('has desktop padding classes', () => {
      const wrapper = mountAppsView();
      const innerContainer = wrapper.find('.mx-auto');
      expect(innerContainer.classes()).toContain('lg:px-8');
    });

    it('has max-width constraint', () => {
      const wrapper = mountAppsView();
      const innerContainer = wrapper.find('.mx-auto');
      expect(innerContainer.classes()).toContain('max-w-7xl');
    });

    it('has bottom padding for mobile nav', () => {
      const wrapper = mountAppsView();
      const container = wrapper.find('.min-h-screen');
      expect(container.classes()).toContain('pb-20');
      expect(container.classes()).toContain('lg:pb-0');
    });
  });

  describe('Tile Content Structure', () => {
    it('Rock-Paper-Scissors tile has correct structure', () => {
      const wrapper = mountAppsView();
      const rpsLink = wrapper.find('[to="/apps/rock-paper-scissors"]');

      // Should have emoji div
      const emoji = rpsLink.find('.text-4xl');
      expect(emoji.exists()).toBe(true);
      expect(emoji.classes()).toContain('mb-3');

      // Should have title
      const title = rpsLink.find('h3');
      expect(title.exists()).toBe(true);
      expect(title.classes()).toContain('text-lg');
      expect(title.classes()).toContain('font-semibold');

      // Should have description
      const description = rpsLink.find('p');
      expect(description.exists()).toBe(true);
      expect(description.classes()).toContain('text-sm');
    });

    it('Cityscape tile has correct structure', () => {
      const wrapper = mountAppsView();
      const cityscapeLink = wrapper.find('[to="/apps/cityscape"]');

      // Should have emoji div
      const emoji = cityscapeLink.find('.text-4xl');
      expect(emoji.exists()).toBe(true);

      // Should have title
      const title = cityscapeLink.find('h3');
      expect(title.exists()).toBe(true);

      // Should have description
      const description = cityscapeLink.find('p');
      expect(description.exists()).toBe(true);
    });
  });

  describe('Tile Order', () => {
    it('renders tiles in correct order', () => {
      const wrapper = mountAppsView();
      const grid = wrapper.find('.grid');
      const children = grid.element.children;

      // First child should be Rock-Paper-Scissors
      expect(children[0].textContent).toContain('Rock-Paper-Scissors');

      // Second child should be Cityscape
      expect(children[1].textContent).toContain('Cityscape');

      // Third child should be Coming Soon
      expect(children[2].textContent).toContain('Coming Soon');
    });

    it('has exactly 3 tiles', () => {
      const wrapper = mountAppsView();
      const grid = wrapper.find('.grid');
      const tiles = grid.findAll('> *');
      expect(tiles.length).toBe(3);
    });
  });

  describe('Accessibility', () => {
    it('app tiles are semantic links', () => {
      const wrapper = mountAppsView();
      const links = wrapper.findAll('a');
      expect(links.length).toBeGreaterThanOrEqual(2);
    });

    it('tile titles use semantic heading elements', () => {
      const wrapper = mountAppsView();
      const headings = wrapper.findAll('h3');
      expect(headings.length).toBe(3); // RPS, Cityscape, Coming Soon
    });

    it('descriptions use semantic paragraph elements', () => {
      const wrapper = mountAppsView();
      const paragraphs = wrapper.findAll('p');
      expect(paragraphs.length).toBe(3);
    });
  });
});
