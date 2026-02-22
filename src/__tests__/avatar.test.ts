import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Avatar from '@/components/shared/Avatar.vue';

describe('Avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders initials fallback by default', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'John Doe',
        },
      });

      expect(wrapper.text()).toContain('JD');
      expect(wrapper.find('img').exists()).toBe(false);
    });

    it('renders image avatar when valid URL is provided', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'John Doe',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      });

      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toBe('https://example.com/avatar.jpg');
      expect(img.attributes('alt')).toBe('John Doe');
      expect(img.attributes('referrerpolicy')).toBe('no-referrer');
    });

    it('renders emoji avatar when emoji is provided', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'John Doe',
          avatarUrl: '🎉',
        },
      });

      expect(wrapper.text()).toContain('🎉');
      expect(wrapper.find('img').exists()).toBe(false);
    });

    it('renders initials when avatarUrl is null', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Jane Smith',
          avatarUrl: null,
        },
      });

      expect(wrapper.text()).toContain('JS');
    });

    it('renders initials when avatarUrl is empty string', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Test User',
          avatarUrl: '',
        },
      });

      expect(wrapper.text()).toContain('TU');
    });
  });

  describe('Initials Generation', () => {
    it('generates initials from first and last name', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'John Doe',
        },
      });

      expect(wrapper.text()).toContain('JD');
    });

    it('generates initials from email address', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'john.doe@example.com',
        },
      });

      // Splits by @ sign: "john.doe" + "example.com" → "JE"
      expect(wrapper.text()).toContain('JE');
    });

    it('generates two-letter initials from single name', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Madonna',
        },
      });

      expect(wrapper.text()).toContain('MA');
    });

    it('handles empty name gracefully', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: '',
        },
      });

      expect(wrapper.text()).toContain('?');
    });

    it('handles name with multiple spaces', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'John   Middle   Doe',
        },
      });

      expect(wrapper.text()).toContain('JM');
    });
  });

  describe('Image Error Handling', () => {
    it('falls back to initials when image fails to load', async () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'John Doe',
          avatarUrl: 'https://example.com/broken.jpg',
        },
      });

      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);

      // Trigger error event
      await img.trigger('error');
      await flushPromises();

      expect(wrapper.text()).toContain('JD');
    });

    it('resets error state when avatarUrl changes', async () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'John Doe',
          avatarUrl: 'https://example.com/broken.jpg',
        },
      });

      // Trigger error
      const img = wrapper.find('img');
      await img.trigger('error');
      await flushPromises();

      // Verify fallback
      expect(wrapper.text()).toContain('JD');

      // Change avatar URL
      await wrapper.setProps({
        avatarUrl: 'https://example.com/working.jpg',
      });
      await flushPromises();

      // Should attempt to load new image
      const newImg = wrapper.find('img');
      expect(newImg.exists()).toBe(true);
      expect(newImg.attributes('src')).toBe('https://example.com/working.jpg');
    });
  });

  describe('Emoji Detection', () => {
    it('renders emoji for single emoji character', () => {
      const emojis = ['😀', '🎉', '👍', '❤️'];

      emojis.forEach((emoji) => {
        const wrapper = mount(Avatar, {
          props: {
            name: 'Test User',
            avatarUrl: emoji,
          },
        });

        expect(wrapper.text()).toContain(emoji);
        expect(wrapper.find('img').exists()).toBe(false);
      });
    });

    it('does not treat URLs as emojis', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      });

      expect(wrapper.find('img').exists()).toBe(true);
    });

    it('does not treat long strings as emojis', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Test User',
          avatarUrl: 'NotAnEmoji',
        },
      });

      // Should fall back to initials
      expect(wrapper.text()).toContain('TU');
      expect(wrapper.find('img').exists()).toBe(false);
    });
  });

  describe('Role Badge', () => {
    it('renders role badge by default', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'John Doe',
          role: 'owner',
        },
      });

      expect(wrapper.text()).toContain('👑');
      expect(wrapper.html()).toContain('Owner');
    });

    it('hides role badge when showRoleBadge is false', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'John Doe',
          role: 'owner',
          showRoleBadge: false,
        },
      });

      expect(wrapper.text()).not.toContain('👑');
    });

    it('renders correct icon for each role', () => {
      const roles = [
        { role: 'owner', icon: '👑' },
        { role: 'admin', icon: '⭐' },
        { role: 'member', icon: '👤' },
        { role: 'child', icon: '👶' },
        { role: 'viewer', icon: '👀' },
      ];

      roles.forEach(({ role, icon }) => {
        const wrapper = mount(Avatar, {
          props: {
            name: 'Test User',
            role,
          },
        });

        expect(wrapper.text()).toContain(icon);
      });
    });

    it('renders correct label for each role', () => {
      const roles = [
        { role: 'owner', label: 'Owner' },
        { role: 'admin', label: 'Admin' },
        { role: 'member', label: 'Member' },
        { role: 'child', label: 'Child' },
        { role: 'viewer', label: 'Viewer' },
      ];

      roles.forEach(({ role, label }) => {
        const wrapper = mount(Avatar, {
          props: {
            name: 'Test User',
            role,
          },
        });

        const badgeSpan = wrapper.find('span[title]');
        expect(badgeSpan.attributes('title')).toBe(label);
      });
    });
  });

  describe('Role-Based Styling', () => {
    it('applies child role border color', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Child User',
          role: 'child',
        },
      });

      const html = wrapper.html();
      expect(html).toContain('border-green-300');
      expect(html).toContain('dark:border-green-600');
    });

    it('applies viewer role border color', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Viewer User',
          role: 'viewer',
        },
      });

      const html = wrapper.html();
      expect(html).toContain('border-purple-300');
      expect(html).toContain('dark:border-purple-600');
    });

    it('applies owner role border color', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Owner User',
          role: 'owner',
        },
      });

      const html = wrapper.html();
      expect(html).toContain('border-yellow-400');
      expect(html).toContain('dark:border-yellow-500');
    });

    it('applies default border color for member role', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Member User',
          role: 'member',
        },
      });

      const html = wrapper.html();
      expect(html).toContain('border-neutral-300');
      expect(html).toContain('dark:border-neutral-600');
    });
  });

  describe('Size Customization', () => {
    it('accepts numeric size prop', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Test User',
          size: 48,
        },
      });

      const container = wrapper.find('.relative');
      expect(container.attributes('style')).toContain('width: 48px');
      expect(container.attributes('style')).toContain('height: 48px');
    });

    it('accepts string size prop with px', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Test User',
          size: '80px',
        },
      });

      const container = wrapper.find('.relative');
      expect(container.attributes('style')).toContain('width: 80px');
      expect(container.attributes('style')).toContain('height: 80px');
    });

    it('accepts string size prop with rem', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Test User',
          size: '4rem',
        },
      });

      const container = wrapper.find('.relative');
      expect(container.attributes('style')).toContain('width: 4rem');
      expect(container.attributes('style')).toContain('height: 4rem');
    });

    it('uses default size of 64px', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Test User',
        },
      });

      const container = wrapper.find('.relative');
      expect(container.attributes('style')).toContain('width: 64px');
      expect(container.attributes('style')).toContain('height: 64px');
    });
  });

  describe('Consistent Color Generation', () => {
    it('generates same color for same name', () => {
      const wrapper1 = mount(Avatar, {
        props: {
          name: 'John Doe',
        },
      });

      const wrapper2 = mount(Avatar, {
        props: {
          name: 'John Doe',
        },
      });

      const style1 = wrapper1
        .find('.flex.items-center.justify-center.rounded-full')
        .attributes('style');
      const style2 = wrapper2
        .find('.flex.items-center.justify-center.rounded-full')
        .attributes('style');

      expect(style1).toBe(style2);
    });

    it('generates different colors for different names', () => {
      const wrapper1 = mount(Avatar, {
        props: {
          name: 'John Doe',
        },
      });

      const wrapper2 = mount(Avatar, {
        props: {
          name: 'Jane Smith',
        },
      });

      const style1 = wrapper1
        .find('.flex.items-center.justify-center.rounded-full')
        .attributes('style');
      const style2 = wrapper2
        .find('.flex.items-center.justify-center.rounded-full')
        .attributes('style');

      expect(style1).not.toBe(style2);
    });
  });

  describe('Accessibility', () => {
    it('includes alt text on images', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'John Doe',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      });

      const img = wrapper.find('img');
      expect(img.attributes('alt')).toBe('John Doe');
    });

    it('includes title attribute on role badge', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Admin User',
          role: 'admin',
        },
      });

      const badge = wrapper.find('span[title]');
      expect(badge.attributes('title')).toBe('Admin');
    });
  });

  describe('Props Validation', () => {
    it('handles null avatarUrl prop', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Test User',
          avatarUrl: null,
        },
      });

      expect(wrapper.text()).toContain('TU');
    });

    it('handles undefined avatarUrl prop', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Test User',
          avatarUrl: undefined,
        },
      });

      expect(wrapper.text()).toContain('TU');
    });

    it('uses default role of member', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Test User',
        },
      });

      expect(wrapper.text()).toContain('👤');
    });

    it('uses default size of 64', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Test User',
        },
      });

      const container = wrapper.find('.relative');
      expect(container.attributes('style')).toContain('64px');
    });

    it('shows role badge by default', () => {
      const wrapper = mount(Avatar, {
        props: {
          name: 'Test User',
        },
      });

      expect(wrapper.find('span[title]').exists()).toBe(true);
    });
  });
});
