import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MemberCard from '@/components/members/MemberCard.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import type { Member } from '@/features/shared/domain/entities';

function createMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    household_id: 'household-1',
    user_id: 'user-1',
    role: 'member',
    display_name: 'John Doe',
    date_of_birth: null,
    avatar_url: null,
    is_active: true,
    joined_at: '2024-01-01T00:00:00Z',
    invited_by: null,
    metadata: {},
    ...overrides,
  };
}

describe('MemberCard', () => {
  const globalConfig = {
    components: { BaseBadge },
  };

  it('renders member name', () => {
    const member = createMember({ display_name: 'Jane Smith' });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    expect(wrapper.text()).toContain('Jane Smith');
  });

  it('renders initials when no avatar_url is provided', () => {
    const member = createMember({ display_name: 'Jane Smith', avatar_url: null });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    // "Jane Smith" → "JS"
    expect(wrapper.text()).toContain('JS');
  });

  it('renders avatar image when avatar_url is provided', () => {
    const member = createMember({
      display_name: 'Jane',
      avatar_url: 'https://example.com/avatar.jpg',
    });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('https://example.com/avatar.jpg');
  });

  it('displays role badge for owner', () => {
    const member = createMember({ role: 'owner', display_name: 'Owner User' });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    expect(wrapper.text()).toContain('Owner');
    expect(wrapper.text()).toContain('👑');
  });

  it('displays role badge for admin', () => {
    const member = createMember({ role: 'admin', display_name: 'Admin User' });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    expect(wrapper.text()).toContain('Admin');
    expect(wrapper.text()).toContain('⭐');
  });

  it('displays role badge for child', () => {
    const member = createMember({
      role: 'child',
      display_name: 'Little One',
      date_of_birth: '2018-06-15',
      user_id: null,
    });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    expect(wrapper.text()).toContain('Child');
    expect(wrapper.text()).toContain('👶');
  });

  it('displays role badge for viewer', () => {
    const member = createMember({ role: 'viewer', display_name: 'View Only' });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    expect(wrapper.text()).toContain('Viewer');
    expect(wrapper.text()).toContain('👀');
  });

  it('shows age for child members with date_of_birth', () => {
    // Set birthday to 5 years ago
    const now = new Date();
    const fiveYearsAgo = new Date(Date.UTC(now.getFullYear() - 5, now.getMonth(), now.getDate()));
    const birthday = fiveYearsAgo.toISOString().split('T')[0];

    const member = createMember({
      role: 'child',
      display_name: 'Child',
      date_of_birth: birthday,
      user_id: null,
    });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    expect(wrapper.text()).toContain('5 years old');
  });

  it('shows email for non-child members', () => {
    const member = createMember({
      display_name: 'John',
      email: 'john@example.com',
    });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    expect(wrapper.text()).toContain('john@example.com');
  });

  it('does not show remove button for owner', () => {
    const member = createMember({ role: 'owner' });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    // Remove button should not exist for owners
    const buttons = wrapper.findAll('button');
    const removeButton = buttons.find((b) => b.attributes('title') === 'Remove member');
    expect(removeButton).toBeUndefined();
  });

  it('shows remove button for non-owner members', () => {
    const member = createMember({ role: 'member' });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    const buttons = wrapper.findAll('button');
    const removeButton = buttons.find((b) => b.attributes('title') === 'Remove member');
    expect(removeButton).toBeDefined();
  });

  it('emits remove event when remove button is clicked', async () => {
    const member = createMember({ role: 'member', id: 'remove-me' });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    const buttons = wrapper.findAll('button');
    const removeButton = buttons.find((b) => b.attributes('title') === 'Remove member');
    expect(removeButton).toBeDefined();
    await removeButton!.trigger('click');

    expect(wrapper.emitted('remove')).toBeTruthy();
    expect(wrapper.emitted('remove')![0]).toEqual(['remove-me']);
  });

  it('shows wishlist and achievements for child members', () => {
    const member = createMember({
      role: 'child',
      display_name: 'Kid',
      date_of_birth: '2020-01-01',
      user_id: null,
    });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    expect(wrapper.text()).toContain('🎁 Wishlist');
    expect(wrapper.text()).toContain('🏆 Achievements');
  });

  it('falls back to email when display_name is empty', () => {
    const member = createMember({
      display_name: '',
      email: 'fallback@example.com',
    });
    const wrapper = mount(MemberCard, {
      props: { member },
      global: globalConfig,
    });

    expect(wrapper.text()).toContain('fallback@example.com');
  });
});
