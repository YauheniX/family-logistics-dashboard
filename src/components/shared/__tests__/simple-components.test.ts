import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EmptyState from '../EmptyState.vue';
import LoadingState from '../LoadingState.vue';

describe('EmptyState', () => {
  it('renders title and description', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No Items',
        description: 'Get started by adding an item',
      },
    });

    expect(wrapper.text()).toContain('No Items');
    expect(wrapper.text()).toContain('Get started by adding an item');
  });

  it('renders CTA button when provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No Items',
        description: 'Description',
        cta: 'Add Item',
      },
    });

    const button = wrapper.find('button');
    expect(button.exists()).toBe(true);
    expect(button.text()).toBe('Add Item');
  });

  it('does not render CTA button when not provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No Items',
        description: 'Description',
      },
    });

    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('emits action event when CTA is clicked', async () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No Items',
        description: 'Description',
        cta: 'Add Item',
      },
    });

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted()).toHaveProperty('action');
    expect(wrapper.emitted('action')).toHaveLength(1);
  });

  it('renders badge when provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No Items',
        description: 'Description',
        badge: 'New Feature',
      },
    });

    expect(wrapper.text()).toContain('New Feature');
  });

  it('does not render badge when not provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No Items',
        description: 'Description',
      },
    });

    const badge = wrapper.find('.rounded-full.bg-slate-100');
    expect(badge.exists()).toBe(false);
  });
});

describe('LoadingState', () => {
  it('renders default loading message', () => {
    const wrapper = mount(LoadingState);

    expect(wrapper.text()).toContain('Loading...');
  });

  it('renders custom loading message', () => {
    const wrapper = mount(LoadingState, {
      props: {
        message: 'Fetching data...',
      },
    });

    expect(wrapper.text()).toContain('Fetching data...');
  });

  it('renders loading indicator', () => {
    const wrapper = mount(LoadingState);

    const indicator = wrapper.find('.animate-ping');
    expect(indicator.exists()).toBe(true);
  });

  it('applies correct classes', () => {
    const wrapper = mount(LoadingState);

    expect(wrapper.classes()).toContain('glass-card');
    expect(wrapper.find('span:last-child').exists()).toBe(true);
  });
});
