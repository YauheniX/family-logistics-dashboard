import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ReportProblemModal from '@/components/shared/ReportProblemModal.vue';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import * as issueReporter from '@/services/issueReporter';

vi.mock('@/services/issueReporter', () => ({
  reportProblem: vi.fn(),
}));

describe('ReportProblemModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders when open is true', () => {
    const wrapper = mount(ReportProblemModal, {
      props: {
        open: true,
      },
      global: {
        stubs: {
          ModalDialog: {
            template: '<div><slot /></div>',
          },
          BaseButton: {
            template: '<button><slot /></button>',
          },
          BaseInput: {
            template: '<input />',
          },
        },
      },
    });

    expect(wrapper.find('#problem-description').exists()).toBe(true);
    const typeSelect = wrapper.find('#problem-label');
    expect(typeSelect.exists()).toBe(true);
    expect(typeSelect.html()).toContain('value="bug"');
    expect(typeSelect.html()).toContain('value="enhancement"');
    expect(typeSelect.findAll('option').length).toBeGreaterThanOrEqual(3);
  });

  it('validates required fields', async () => {
    const wrapper = mount(ReportProblemModal, {
      props: {
        open: true,
      },
      global: {
        stubs: {
          ModalDialog: {
            template: '<div><slot /></div>',
          },
          BaseButton: {
            template: '<button type="button" @click="$attrs.onClick"><slot /></button>',
            inheritAttrs: false,
          },
          BaseInput: {
            template:
              '<input v-model="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue'],
            emits: ['update:modelValue'],
          },
        },
      },
    });

    // Try to submit without filling fields
    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    // Validation should prevent submission
    expect(issueReporter.reportProblem).not.toHaveBeenCalled();
  });

  // Screenshot-related UI removed; screenshot-specific tests omitted.

  it('submits valid form successfully', async () => {
    vi.mocked(issueReporter.reportProblem).mockResolvedValue({
      issueUrl: 'https://github.com/test/repo/issues/1',
    });

    const authStore = useAuthStore();
    authStore.user = {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const wrapper = mount(ReportProblemModal, {
      props: {
        open: true,
      },
      global: {
        stubs: {
          ModalDialog: {
            template: '<div><slot /></div>',
          },
          BaseButton: {
            template: '<button type="button" @click="$attrs.onClick"><slot /></button>',
            inheritAttrs: false,
          },
          BaseInput: {
            template:
              '<input v-model="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue'],
            emits: ['update:modelValue'],
          },
        },
      },
    });

    // Fill in form fields using component internals
    const vm = wrapper.vm as unknown as {
      title: string;
      description: string;
    };
    vm.title = 'Test Issue';
    vm.description = 'Test description';
    await wrapper.vm.$nextTick();

    // Submit form
    const form = wrapper.find('form');
    await form.trigger('submit.prevent');
    await wrapper.vm.$nextTick();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(issueReporter.reportProblem).toHaveBeenCalledWith({
      title: 'Test Issue',
      description: 'Test description',
      userId: 'user-123',
      label: 'bug',
    });

    const toastStore = useToastStore();
    expect(toastStore.toasts).toHaveLength(1);
    expect(toastStore.toasts[0].message).toContain('Issue created');
    expect(toastStore.toasts[0].type).toBe('success');
  });

  it('shows error toast on submission failure', async () => {
    vi.mocked(issueReporter.reportProblem).mockRejectedValue(new Error('Network error'));

    const authStore = useAuthStore();
    authStore.user = {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const wrapper = mount(ReportProblemModal, {
      props: {
        open: true,
      },
      global: {
        stubs: {
          ModalDialog: {
            template: '<div><slot /></div>',
          },
          BaseButton: {
            template: '<button type="button" @click="$attrs.onClick"><slot /></button>',
            inheritAttrs: false,
          },
          BaseInput: {
            template:
              '<input v-model="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue'],
            emits: ['update:modelValue'],
          },
        },
      },
    });

    // Fill in form fields
    const vm = wrapper.vm as unknown as {
      title: string;
      description: string;
    };
    vm.title = 'Test Issue';
    vm.description = 'Test description';
    await wrapper.vm.$nextTick();

    // Submit form
    const form = wrapper.find('form');
    await form.trigger('submit.prevent');
    await wrapper.vm.$nextTick();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    const toastStore = useToastStore();
    expect(toastStore.toasts).toHaveLength(1);
    expect(toastStore.toasts[0].message).toBe('Network error');
    expect(toastStore.toasts[0].type).toBe('error');
  });

  it('resets form when closed', async () => {
    const wrapper = mount(ReportProblemModal, {
      props: {
        open: true,
      },
      global: {
        stubs: {
          ModalDialog: {
            template: '<div><slot /></div>',
          },
          BaseButton: {
            template: '<button type="button" @click="$attrs.onClick"><slot /></button>',
            inheritAttrs: false,
          },
          BaseInput: {
            template:
              '<input v-model="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue'],
            emits: ['update:modelValue'],
          },
        },
      },
    });

    // Fill in form fields
    const vm = wrapper.vm as unknown as {
      title: string;
      description: string;
      handleClose: () => void;
    };
    vm.title = 'Test Issue';
    vm.description = 'Test description';
    await wrapper.vm.$nextTick();

    // Close modal
    vm.handleClose();
    await wrapper.vm.$nextTick();

    // Form should be reset
    expect(vm.title).toBe('');
    expect(vm.description).toBe('');
    // screenshot removed from UI; nothing to assert here
  });

  it('emits close event when modal is closed', async () => {
    const wrapper = mount(ReportProblemModal, {
      props: {
        open: true,
      },
      global: {
        stubs: {
          ModalDialog: {
            template: '<div><slot /></div>',
          },
          BaseButton: {
            template: '<button type="button" @click="$attrs.onClick"><slot /></button>',
            inheritAttrs: false,
          },
          BaseInput: {
            template: '<input />',
          },
        },
      },
    });

    const vm = wrapper.vm as unknown as { handleClose: () => void };
    vm.handleClose();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
