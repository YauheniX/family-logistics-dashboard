import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ReportProblemModal from '@/components/shared/ReportProblemModal.vue';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import * as issueReporter from '@/services/issueReporter';
import type { ScreenshotPayload } from '@/services/issueReporter';

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
    expect(wrapper.find('#problem-screenshot').exists()).toBe(true);
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

  it('validates file type for screenshot', async () => {
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

    const fileInput = wrapper.find('#problem-screenshot');

    // Create a mock non-image file
    const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      writable: false,
    });

    await fileInput.trigger('change');
    await wrapper.vm.$nextTick();

    // Should show error for non-image file
    expect(wrapper.text()).toContain('Please choose an image file.');
  });

  it('validates file size for screenshot', async () => {
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

    const fileInput = wrapper.find('#problem-screenshot');

    // Create a mock large image file (>2MB)
    const largeContent = new Array(3 * 1024 * 1024).fill('a').join('');
    const file = new File([largeContent], 'large-image.png', { type: 'image/png' });
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      writable: false,
    });

    await fileInput.trigger('change');
    await wrapper.vm.$nextTick();

    // Should show error for large file
    expect(wrapper.text()).toContain('Screenshot is too large');
  });

  it('clears file input on error', async () => {
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

    const fileInput = wrapper.find('#problem-screenshot');
    const inputElement = fileInput.element as HTMLInputElement;

    // Create a mock non-image file
    const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
    Object.defineProperty(inputElement, 'files', {
      value: [file],
      writable: false,
    });

    await fileInput.trigger('change');
    await wrapper.vm.$nextTick();

    // File input should be cleared
    expect(inputElement.value).toBe('');
  });

  it('submits valid form successfully', async () => {
    vi.mocked(issueReporter.reportProblem).mockResolvedValue({
      issueUrl: 'https://github.com/test/repo/issues/1',
    });

    const authStore = useAuthStore();
    authStore.user = { id: 'user-123', email: 'test@example.com' };

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
      screenshot: ScreenshotPayload | null;
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
      screenshot: null,
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
    authStore.user = { id: 'user-123', email: 'test@example.com' };

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
      screenshot: ScreenshotPayload | null;
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
      screenshot: ScreenshotPayload | null;
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
    expect(vm.screenshot).toBe(null);
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

  it('handles valid image file upload successfully', async () => {
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

    const fileInput = wrapper.find('#problem-screenshot');

    // Create a valid image file
    const imageContent =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const blob = await (await fetch(imageContent)).blob();
    const file = new File([blob], 'test-image.png', { type: 'image/png' });

    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      writable: false,
    });

    await fileInput.trigger('change');
    await wrapper.vm.$nextTick();

    // Should not show any error
    expect(wrapper.text()).not.toContain('Please choose an image file.');
    expect(wrapper.text()).not.toContain('Screenshot is too large');
  });

  it('handles file selection cancellation', async () => {
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

    const fileInput = wrapper.find('#problem-screenshot');
    const inputElement = fileInput.element as HTMLInputElement;

    // Simulate file selection cancellation (no files)
    Object.defineProperty(inputElement, 'files', {
      value: null,
      writable: false,
    });

    await fileInput.trigger('change');
    await wrapper.vm.$nextTick();

    // Should not show any error
    const vm = wrapper.vm as unknown as { screenshot: ScreenshotPayload | null };
    expect(vm.screenshot).toBe(null);
  });

  it('submits form with valid image screenshot', async () => {
    vi.mocked(issueReporter.reportProblem).mockResolvedValue({
      issueUrl: 'https://github.com/test/repo/issues/2',
    });

    const authStore = useAuthStore();
    authStore.user = { id: 'user-456', email: 'user@example.com' };

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
      screenshot: ScreenshotPayload | null;
    };
    vm.title = 'Bug with screenshot';
    vm.description = 'See attached screenshot';

    // Add a screenshot
    const imageContent =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const blob = await (await fetch(imageContent)).blob();
    const file = new File([blob], 'screenshot.png', { type: 'image/png' });

    const fileInput = wrapper.find('#problem-screenshot');
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      writable: false,
    });

    await fileInput.trigger('change');
    await wrapper.vm.$nextTick();

    // Wait for FileReader to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Submit form
    const form = wrapper.find('form');
    await form.trigger('submit.prevent');
    await wrapper.vm.$nextTick();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(issueReporter.reportProblem).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Bug with screenshot',
        description: 'See attached screenshot',
        userId: 'user-456',
        label: 'bug',
      }),
    );

    // Check that screenshot was included
    const callArgs = vi.mocked(issueReporter.reportProblem).mock.calls[0][0];
    expect(callArgs.screenshot).not.toBeNull();
    expect(callArgs.screenshot?.name).toBe('screenshot.png');
    expect(callArgs.screenshot?.type).toBe('image/png');
  });

  it('does not open issue URL in a new window on successful submission', async () => {
    // Mock window.open
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    vi.mocked(issueReporter.reportProblem).mockResolvedValue({
      issueUrl: 'https://github.com/test/repo/issues/3',
    });

    const authStore = useAuthStore();
    authStore.user = { id: 'user-789', email: 'test@example.com' };

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
    vm.title = 'Test Issue with URL';
    vm.description = 'Test description';
    await wrapper.vm.$nextTick();

    // Submit form
    const form = wrapper.find('form');
    await form.trigger('submit.prevent');
    await wrapper.vm.$nextTick();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(windowOpenSpy).not.toHaveBeenCalled();

    windowOpenSpy.mockRestore();
  });

  it('handles FileReader errors when reading screenshot', async () => {
    const originalFileReader = globalThis.FileReader;

    class MockFileReader {
      public result: string | ArrayBuffer | null = null;
      public onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null;
      public onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null;

      readAsDataURL(_file: Blob) {
        if (this.onerror) {
          // Simulate a read error
          this.onerror(new ProgressEvent('error'));
        }
      }
    }

    // Override global FileReader to simulate an error during file reading
    (globalThis as unknown as { FileReader: typeof FileReader }).FileReader =
      MockFileReader as unknown as typeof FileReader;

    try {
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

      const fileInput = wrapper.find('#problem-screenshot');
      const inputElement = fileInput.element as HTMLInputElement;

      const file = new File(['dummy'], 'screenshot.png', { type: 'image/png' });
      Object.defineProperty(inputElement, 'files', {
        value: [file],
        writable: false,
      });

      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should show an error message
      expect(wrapper.text()).toContain('Failed to read the screenshot file');
    } finally {
      (globalThis as unknown as { FileReader: typeof FileReader }).FileReader = originalFileReader;
    }
  });
});
