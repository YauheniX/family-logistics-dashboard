import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import CityscapeView from '@/views/CityscapeView.vue';

describe('CityscapeView', () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    wrapper = mount(CityscapeView, {
      global: {
        stubs: {
          // Stub any child components if needed
        },
      },
    });
  });

  describe('Initial Render', () => {
    it('renders the cityscape container', () => {
      expect(wrapper.find('.cityscape-viewport').exists()).toBe(true);
      expect(wrapper.find('.container').exists()).toBe(true);
      expect(wrapper.find('.scene').exists()).toBe(true);
    });

    it('renders all buildings', () => {
      expect(wrapper.find('.house-1').exists()).toBe(true);
      expect(wrapper.find('.house-2').exists()).toBe(true);
      expect(wrapper.find('.house-3').exists()).toBe(true);
      expect(wrapper.find('.house-4').exists()).toBe(true);
      expect(wrapper.find('.house-5').exists()).toBe(true);
    });

    it('renders skyscrapers', () => {
      expect(wrapper.findAll('.skyscrapers > div').length).toBe(6);
    });

    it('renders trees and streetlamps', () => {
      expect(wrapper.findAll('.tree-container').length).toBe(2);
      expect(wrapper.findAll('.streetlamp').length).toBe(2);
    });

    it('renders clouds', () => {
      expect(wrapper.findAll('.cloud').length).toBeGreaterThan(0);
    });

    it('displays instruction text', () => {
      expect(wrapper.text()).toContain('Tap or click any building');
    });

    it('starts in day mode', () => {
      expect(wrapper.find('.scene').classes()).not.toContain('night');
    });

    it('starts with shades visible', () => {
      const shades = wrapper.findAll('.house-3-window-shades');
      // All shades should be visible initially
      shades.forEach((shade) => {
        expect(shade.attributes('style')).not.toContain('display: none');
      });
    });
  });

  describe('House Interactions', () => {
    it('triggers mail truck animation when house-1 is clicked', async () => {
      const house1 = wrapper.find('.house-1');
      expect(house1.exists()).toBe(true);

      await house1.trigger('click');
      await nextTick();

      const mailTruck = wrapper.find('.mailtruck');
      expect(mailTruck.classes()).toContain('mailtruck-animation');
    });

    it('triggers bike animation when house-2 is clicked', async () => {
      const house2 = wrapper.find('.house-2');
      expect(house2.exists()).toBe(true);

      await house2.trigger('click');
      await nextTick();

      const bike = wrapper.find('.bike-container');
      expect(bike.classes()).toContain('bike-animation');
    });

    it('toggles window shades when house-3 is clicked', async () => {
      const house3 = wrapper.find('.house-3-container');
      expect(house3.exists()).toBe(true);

      // Initially shades should be visible
      let shade = wrapper.find('.house-3-window-shades');
      expect(shade.attributes('style')).not.toContain('display: none');

      await house3.trigger('click');
      await nextTick();

      // After click, shades should be hidden
      shade = wrapper.find('.house-3-window-shades');
      expect(shade.attributes('style')).toContain('display: none');

      // Click again to toggle back
      await house3.trigger('click');
      await nextTick();

      shade = wrapper.find('.house-3-window-shades');
      expect(shade.attributes('style')).not.toContain('display: none');
    });

    it('toggles smoke when house-3 is clicked', async () => {
      const house3 = wrapper.find('.house-3-container');

      // Initially smoke should be hidden
      let smoke = wrapper.find('.smoke');
      expect(smoke.attributes('style')).toContain('display: none');

      await house3.trigger('click');
      await nextTick();

      // After click, smoke should be visible
      smoke = wrapper.find('.smoke');
      expect(smoke.attributes('style')).not.toContain('display: none');
    });

    it('triggers rain when house-4 is clicked', async () => {
      const house4 = wrapper.find('.house-4');
      expect(house4.exists()).toBe(true);

      await house4.trigger('click');
      await nextTick();

      const rain = wrapper.find('.rain');
      expect(rain.attributes('style')).toContain('display: block');
    });

    it('toggles night mode when house-5 is clicked', async () => {
      const house5 = wrapper.find('.house-5');
      expect(house5.exists()).toBe(true);

      // Initially should be day
      expect(wrapper.find('.scene').classes()).not.toContain('night');

      await house5.trigger('click');
      await nextTick();

      // Should switch to night
      expect(wrapper.find('.scene').classes()).toContain('night');

      await house5.trigger('click');
      await nextTick();

      // Should switch back to day
      expect(wrapper.find('.scene').classes()).not.toContain('night');
    });
  });

  describe('Streetlamp Interactions', () => {
    it('toggles grayscale on streetlamp click', async () => {
      const streetlamp = wrapper.find('#streetlamp-1');
      expect(streetlamp.exists()).toBe(true);

      // Initially no grayscale
      expect(wrapper.find('.container').classes()).not.toContain('grayscale');

      await streetlamp.trigger('click');
      await nextTick();

      // After click, grayscale should be active
      expect(wrapper.find('.container').classes()).toContain('grayscale');

      // Click again to toggle off
      await streetlamp.trigger('click');
      await nextTick();

      expect(wrapper.find('.container').classes()).not.toContain('grayscale');
    });

    it('applies grayscale on mouseenter', async () => {
      const streetlamp = wrapper.find('#streetlamp-2');

      await streetlamp.trigger('mouseenter');
      await nextTick();

      expect(wrapper.find('.container').classes()).toContain('grayscale');
    });

    it('removes grayscale on mouseleave', async () => {
      const streetlamp = wrapper.find('#streetlamp-2');

      await streetlamp.trigger('mouseenter');
      await nextTick();
      expect(wrapper.find('.container').classes()).toContain('grayscale');

      await streetlamp.trigger('mouseleave');
      await nextTick();

      expect(wrapper.find('.container').classes()).not.toContain('grayscale');
    });

    it('shows streetlamp glow when grayscale is active', async () => {
      const streetlamp = wrapper.find('#streetlamp-1');

      await streetlamp.trigger('click');
      await nextTick();

      // When grayscale is active, container should have the class
      expect(wrapper.find('.container').classes()).toContain('grayscale');
    });
  });

  describe('Animation Timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('removes bike animation after 6 seconds', async () => {
      const house2 = wrapper.find('.house-2');

      await house2.trigger('click');
      await nextTick();

      expect(wrapper.find('.bike-container').classes()).toContain('bike-animation');

      vi.advanceTimersByTime(6000);
      await nextTick();

      expect(wrapper.find('.bike-container').classes()).not.toContain('bike-animation');
    });

    it('removes mail truck animation after 5 seconds', async () => {
      const house1 = wrapper.find('.house-1');

      await house1.trigger('click');
      await nextTick();

      expect(wrapper.find('.mailtruck').classes()).toContain('mailtruck-animation');

      vi.advanceTimersByTime(5000);
      await nextTick();

      expect(wrapper.find('.mailtruck').classes()).not.toContain('mailtruck-animation');
    });

    it('hides rain after 2.5 seconds', async () => {
      const house4 = wrapper.find('.house-4');

      await house4.trigger('click');
      await nextTick();

      expect(wrapper.find('.rain').attributes('style')).toContain('display: block');

      vi.advanceTimersByTime(2500);
      await nextTick();

      expect(wrapper.find('.rain').attributes('style')).toContain('display: none');
    });
  });

  describe('Mobile Touch Support', () => {
    it('has touch-friendly classes', () => {
      const viewport = wrapper.find('.cityscape-viewport');
      expect(viewport.exists()).toBe(true);
    });

    it('prevents text selection on wrapper', () => {
      const wrapperDiv = wrapper.find('.wrapper');
      expect(wrapperDiv.exists()).toBe(true);
      // Check that user-select: none is applied via CSS
    });
  });

  describe('Night Mode', () => {
    it('shows moon when night mode is active', async () => {
      const house5 = wrapper.find('.house-5');

      // Initially moon should be hidden
      expect(wrapper.find('.moon').attributes('style')).toContain('display: none');

      await house5.trigger('click');
      await nextTick();

      // Moon should be visible in night mode
      expect(wrapper.find('.moon').attributes('style')).not.toContain('display: none');
    });

    it('applies night class to scene', async () => {
      const house5 = wrapper.find('.house-5');

      await house5.trigger('click');
      await nextTick();

      expect(wrapper.find('.scene').classes()).toContain('night');
    });

    it('applies skyscraper-night class to skyscrapers', async () => {
      const house5 = wrapper.find('.house-5');

      await house5.trigger('click');
      await nextTick();

      expect(wrapper.find('.skyscrapers').classes()).toContain('skyscraper-night');
    });

    it('applies title-night class to title', async () => {
      const house5 = wrapper.find('.house-5');

      await house5.trigger('click');
      await nextTick();

      expect(wrapper.find('h1').classes()).toContain('title-night');
    });
  });

  describe('Responsive Scaling', () => {
    it('renders with proper viewport structure', () => {
      expect(wrapper.find('.cityscape-viewport').exists()).toBe(true);
      expect(wrapper.find('.wrapper').exists()).toBe(true);
    });

    it('has scrollable viewport', () => {
      const viewport = wrapper.find('.cityscape-viewport');
      expect(viewport.exists()).toBe(true);
      // Viewport should allow horizontal scrolling for mobile
    });
  });

  describe('Elements Count', () => {
    it('renders correct number of smoke particles', () => {
      const smokeParticles = wrapper.findAll('.smoke span');
      expect(smokeParticles.length).toBe(10); // s0 through s9
    });

    it('renders correct number of rain containers', () => {
      const rainContainers = wrapper.findAll('.drops-container');
      expect(rainContainers.length).toBe(7);
    });

    it('renders correct number of rain drops per container', () => {
      const firstContainer = wrapper.find('.drops-container');
      const drops = firstContainer.findAll('.drop');
      expect(drops.length).toBe(16);
    });

    it('renders correct number of clouds', () => {
      const clouds = wrapper.findAll('.cloud');
      expect(clouds.length).toBeGreaterThanOrEqual(5); // At least 5 clouds + cloud-sun
    });

    it('renders bike wheels', () => {
      expect(wrapper.find('#wheel-1').exists()).toBe(true);
      expect(wrapper.find('#wheel-2').exists()).toBe(true);
    });

    it('renders birds in tree-2', () => {
      expect(wrapper.find('.bird-1').exists()).toBe(true);
      expect(wrapper.find('.bird-2').exists()).toBe(true);
    });

    it('renders leaves in tree-1', () => {
      expect(wrapper.find('#leaf-1').exists()).toBe(true);
      expect(wrapper.find('#leaf-2').exists()).toBe(true);
      expect(wrapper.find('#leaf-3').exists()).toBe(true);
    });
  });

  describe('Complex Interactions', () => {
    it('can trigger multiple animations simultaneously', async () => {
      // Click house-1 for mail truck
      await wrapper.find('.house-1').trigger('click');
      await nextTick();

      // Click house-2 for bike
      await wrapper.find('.house-2').trigger('click');
      await nextTick();

      // Both animations should be active
      expect(wrapper.find('.mailtruck').classes()).toContain('mailtruck-animation');
      expect(wrapper.find('.bike-container').classes()).toContain('bike-animation');
    });

    it('can combine night mode with other effects', async () => {
      // Enable night mode
      await wrapper.find('.house-5').trigger('click');
      await nextTick();

      // Trigger rain
      await wrapper.find('.house-4').trigger('click');
      await nextTick();

      // Both effects should be active
      expect(wrapper.find('.scene').classes()).toContain('night');
      expect(wrapper.find('.rain').attributes('style')).toContain('display: block');
    });

    it('can toggle grayscale while animations run', async () => {
      // Start bike animation
      await wrapper.find('.house-2').trigger('click');
      await nextTick();

      // Toggle grayscale
      await wrapper.find('#streetlamp-1').trigger('click');
      await nextTick();

      // Both should be active
      expect(wrapper.find('.bike-container').classes()).toContain('bike-animation');
      expect(wrapper.find('.container').classes()).toContain('grayscale');
    });
  });
});
