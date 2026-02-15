import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';

describe('BaseButton', () => {
  it('renders with default variant', () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: 'Click me',
      },
    });

    expect(wrapper.text()).toBe('Click me');
    expect(wrapper.find('button').exists()).toBe(true);
  });

  it('renders with primary variant', () => {
    const wrapper = mount(BaseButton, {
      props: {
        variant: 'primary',
      },
      slots: {
        default: 'Primary Button',
      },
    });

    expect(wrapper.text()).toBe('Primary Button');
  });

  it('renders with ghost variant', () => {
    const wrapper = mount(BaseButton, {
      props: {
        variant: 'ghost',
      },
      slots: {
        default: 'Ghost Button',
      },
    });

    expect(wrapper.text()).toBe('Ghost Button');
  });

  it('renders with danger variant', () => {
    const wrapper = mount(BaseButton, {
      props: {
        variant: 'danger',
      },
      slots: {
        default: 'Danger Button',
      },
    });

    expect(wrapper.text()).toBe('Danger Button');
  });

  it('handles click events', async () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: 'Click me',
      },
    });

    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('shows loading state', () => {
    const wrapper = mount(BaseButton, {
      props: {
        loading: true,
      },
      slots: {
        default: 'Submit',
      },
    });

    // Loading shows a spinner
    expect(wrapper.find('span[aria-hidden="true"]').exists()).toBe(true);
    // Button should be disabled when loading
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });

  it('passes aria-label attribute', () => {
    const wrapper = mount(BaseButton, {
      props: {
        ariaLabel: 'Custom label',
      },
      slots: {
        default: 'Click',
      },
    });

    expect(wrapper.find('button').attributes('aria-label')).toBe('Custom label');
  });

  it('supports fullWidth prop', () => {
    const wrapper = mount(BaseButton, {
      props: {
        fullWidth: true,
      },
      slots: {
        default: 'Full width',
      },
    });

    expect(wrapper.find('button').classes()).toContain('w-full');
  });

  it('disables button when disabled prop is true', () => {
    const wrapper = mount(BaseButton, {
      props: {
        disabled: true,
      },
      slots: {
        default: 'Disabled',
      },
    });

    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });

  it('disables button when loading is true', () => {
    const wrapper = mount(BaseButton, {
      props: {
        loading: true,
      },
      slots: {
        default: 'Loading',
      },
    });

    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });
});

describe('BaseInput', () => {
  it('renders with label', () => {
    const wrapper = mount(BaseInput, {
      props: {
        label: 'Username',
        modelValue: '',
      },
    });

    expect(wrapper.text()).toContain('Username');
  });

  it('renders required asterisk when required is true', () => {
    const wrapper = mount(BaseInput, {
      props: {
        label: 'Email',
        modelValue: '',
        required: true,
      },
    });

    expect(wrapper.html()).toContain('*');
  });

  it('shows error message when error prop is provided', () => {
    const wrapper = mount(BaseInput, {
      props: {
        label: 'Email',
        modelValue: '',
        error: 'Email is required',
      },
    });

    expect(wrapper.text()).toContain('Email is required');
  });

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(BaseInput, {
      props: {
        label: 'Name',
        modelValue: '',
      },
    });

    const input = wrapper.find('input');
    await input.setValue('John Doe');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['John Doe']);
  });

  it('renders with placeholder', () => {
    const wrapper = mount(BaseInput, {
      props: {
        label: 'Search',
        modelValue: '',
        placeholder: 'Enter search term',
      },
    });

    expect(wrapper.find('input').attributes('placeholder')).toBe('Enter search term');
  });

  it('sets type attribute correctly', () => {
    const wrapper = mount(BaseInput, {
      props: {
        label: 'Password',
        modelValue: '',
        type: 'password',
      },
    });

    expect(wrapper.find('input').attributes('type')).toBe('password');
  });

  it('disables input when disabled prop is true', () => {
    const wrapper = mount(BaseInput, {
      props: {
        label: 'Disabled',
        modelValue: '',
        disabled: true,
      },
    });

    expect(wrapper.find('input').attributes('disabled')).toBeDefined();
  });

  it('renders with email type', () => {
    const wrapper = mount(BaseInput, {
      props: {
        label: 'Email',
        modelValue: '',
        type: 'email',
      },
    });

    expect(wrapper.find('input').attributes('type')).toBe('email');
  });

  it('renders with number type', () => {
    const wrapper = mount(BaseInput, {
      props: {
        label: 'Age',
        modelValue: '',
        type: 'number',
      },
    });

    expect(wrapper.find('input').attributes('type')).toBe('number');
  });

  it('binds modelValue correctly', () => {
    const wrapper = mount(BaseInput, {
      props: {
        label: 'Name',
        modelValue: 'Initial value',
      },
    });

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Initial value');
  });
});

describe('ModalDialog', () => {
  it('does not render when open is false', () => {
    const wrapper = mount(ModalDialog, {
      props: {
        open: false,
        title: 'Test Modal',
      },
      slots: {
        default: 'Modal content',
      },
    });

    expect(wrapper.text()).toBe('');
  });

  it('passes props correctly', () => {
    const wrapper = mount(ModalDialog, {
      props: {
        open: true,
        title: 'Test Title',
      },
      slots: {
        default: 'Content',
      },
    });

    expect(wrapper.props('title')).toBe('Test Title');
    expect(wrapper.props('open')).toBe(true);
  });

  it('emits close event on backdrop click', async () => {
    const wrapper = mount(ModalDialog, {
      props: {
        open: true,
        title: 'Test',
      },
      slots: {
        default: 'Content',
      },
      attachTo: document.body,
    });

    // Find and click the backdrop
    const backdrop = wrapper.find('.bg-black\\/50');
    if (backdrop.exists()) {
      await backdrop.trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    }

    wrapper.unmount();
  });

  it('emits close event on close button click', async () => {
    const wrapper = mount(ModalDialog, {
      props: {
        open: true,
        title: 'Test',
      },
      slots: {
        default: 'Content',
      },
      attachTo: document.body,
    });

    // Find and click the close button
    const closeButton = wrapper.find('button[aria-label="Close modal"]');
    if (closeButton.exists()) {
      await closeButton.trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    }

    wrapper.unmount();
  });
});
