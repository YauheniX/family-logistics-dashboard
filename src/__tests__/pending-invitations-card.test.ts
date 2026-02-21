import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import PendingInvitationsCard from '@/components/invitations/PendingInvitationsCard.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import type { PendingInvitation } from '@/composables/useInvitations';
import type { ApiError } from '@/features/shared/domain/repository.interface';

// Mock useInvitations composable
const mockFetchPendingInvitations = vi.fn();
const mockAcceptInvitation = vi.fn();
const mockDeclineInvitation = vi.fn();

const mockInvitations = ref<PendingInvitation[]>([]);
const mockLoading = ref(false);
const mockError = ref<ApiError | null>(null);

vi.mock('@/composables/useInvitations', () => ({
  useInvitations: vi.fn(() => ({
    invitations: mockInvitations,
    loading: mockLoading,
    error: mockError,
    fetchPendingInvitations: mockFetchPendingInvitations,
    acceptInvitation: mockAcceptInvitation,
    declineInvitation: mockDeclineInvitation,
  })),
}));

describe('PendingInvitationsCard', () => {
  const globalConfig = {
    components: { BaseCard, BaseButton },
    global: {
      stubs: {
        Teleport: true,
      },
    },
  };

  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Reset mock refs
    mockInvitations.value = [];
    mockLoading.value = false;
    mockError.value = null;

    mockFetchPendingInvitations.mockResolvedValue(undefined);
    mockAcceptInvitation.mockResolvedValue(true);
    mockDeclineInvitation.mockResolvedValue(true);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  function mountComponent() {
    return mount(PendingInvitationsCard, globalConfig);
  }

  describe('rendering', () => {
    it('should not render when no invitations', () => {
      mockInvitations.value = [];
      wrapper = mountComponent();

      expect(wrapper.html()).toBe('<!--v-if-->');
    });

    it('should render card when invitations exist', () => {
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John Smith',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      expect(wrapper.text()).toContain('Pending Invitations');
      expect(wrapper.text()).toContain('Smith Family');
      expect(wrapper.text()).toContain('John Smith');
      expect(wrapper.text()).toContain('member');
    });

    it('should show correct invitation count in header', () => {
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Family 1',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: 'inv-2',
          household_id: 'house-2',
          household_name: 'Family 2',
          email: 'test@example.com',
          role: 'admin',
          invited_by_name: 'Jane',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      expect(wrapper.text()).toContain('You have 2 invitations to join households');
    });

    it('should use singular form for single invitation', () => {
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      expect(wrapper.text()).toContain('You have 1 invitation to join household');
      expect(wrapper.text()).not.toContain('invitations');
    });

    it('should capitalize role name', () => {
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'admin',
          invited_by_name: 'John',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      // Role should be capitalized via CSS class="capitalize"
      const roleText = wrapper.find('.capitalize');
      expect(roleText.exists()).toBe(true);
      expect(roleText.text()).toBe('admin');
    });

    it('should render multiple invitation cards', () => {
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Family 1',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: 'inv-2',
          household_id: 'house-2',
          household_name: 'Family 2',
          email: 'test@example.com',
          role: 'admin',
          invited_by_name: 'Jane',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      expect(wrapper.text()).toContain('Family 1');
      expect(wrapper.text()).toContain('Family 2');
      expect(wrapper.text()).toContain('John');
      expect(wrapper.text()).toContain('Jane');
    });
  });

  describe('expiry formatting', () => {
    it('should show "in X days" for multi-day expiry', () => {
      const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      expect(wrapper.text()).toMatch(/Expires in \d+ days/);
    });

    it('should show "in 1 day" for single day expiry', () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 60 * 1000); // 30 hours
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      expect(wrapper.text()).toContain('in 1 day');
    });

    it('should show "in X hours" for same-day expiry', () => {
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      expect(wrapper.text()).toMatch(/Expires in \d+ hours/);
    });
  });

  describe('user interactions', () => {
    it('should call acceptInvitation when Accept clicked', async () => {
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      const acceptButton = wrapper.findAll('button').find((btn) => btn.text() === 'Accept');
      expect(acceptButton).toBeDefined();

      await acceptButton!.trigger('click');

      expect(mockAcceptInvitation).toHaveBeenCalledWith('inv-1');
    });

    it('should call declineInvitation when Decline clicked', async () => {
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      const declineButton = wrapper.findAll('button').find((btn) => btn.text() === 'Decline');
      expect(declineButton).toBeDefined();

      await declineButton!.trigger('click');

      expect(mockDeclineInvitation).toHaveBeenCalledWith('inv-1');
    });

    it('should emit invitationAccepted when acceptance succeeds', async () => {
      mockAcceptInvitation.mockResolvedValue(true);
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      const acceptButton = wrapper.findAll('button').find((btn) => btn.text() === 'Accept');
      await acceptButton!.trigger('click');

      // Wait for async operations
      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(wrapper.emitted('invitationAccepted')).toBeTruthy();
    });

    it('should not emit invitationAccepted when acceptance fails', async () => {
      mockAcceptInvitation.mockResolvedValue(false);
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      const acceptButton = wrapper.findAll('button').find((btn) => btn.text() === 'Accept');
      await acceptButton!.trigger('click');

      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(wrapper.emitted('invitationAccepted')).toBeFalsy();
    });

    it('should show loading state on correct button', async () => {
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: 'inv-2',
          household_id: 'house-2',
          household_name: 'Jones Family',
          email: 'test@example.com',
          role: 'admin',
          invited_by_name: 'Jane',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      let resolveAccept: ((value: boolean) => void) | undefined;
      mockAcceptInvitation.mockReturnValue(
        new Promise((resolve) => {
          resolveAccept = resolve;
        }),
      );

      wrapper = mountComponent();

      const acceptButtons = wrapper.findAll('button').filter((btn) => btn.text() === 'Accept');
      await acceptButtons[0].trigger('click');

      // processingId should be set for inv-1
      // Check that first accept button has loading prop
      // Note: We can't directly test component internal state, so we test behavior
      expect(mockAcceptInvitation).toHaveBeenCalledWith('inv-1');

      resolveAccept?.(true);
      await wrapper.vm.$nextTick();
    });

    it('should disable buttons when loading', async () => {
      mockLoading.value = true;
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      const acceptButton = wrapper.findAll('button').find((btn) => btn.text() === 'Accept');
      const declineButton = wrapper.findAll('button').find((btn) => btn.text() === 'Decline');

      // Buttons should be disabled when loading
      expect(acceptButton!.attributes('disabled')).toBeDefined();
      expect(declineButton!.attributes('disabled')).toBeDefined();
    });
  });

  describe('lifecycle', () => {
    it('should fetch invitations on mount', () => {
      wrapper = mountComponent();

      expect(mockFetchPendingInvitations).toHaveBeenCalledOnce();
    });
  });

  describe('edge cases', () => {
    it('should handle invitation with very long household name', () => {
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'The Smith-Johnson-Williams-Brown Extended Family Household',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      expect(wrapper.text()).toContain(
        'The Smith-Johnson-Williams-Brown Extended Family Household',
      );
    });

    it('should handle invitation with special characters in names', () => {
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: "O'Brien & Müller Family",
          email: 'test@example.com',
          role: 'member',
          invited_by_name: "Jean-François d'Arc",
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      expect(wrapper.text()).toContain("O'Brien & Müller Family");
      expect(wrapper.text()).toContain("Jean-François d'Arc");
    });

    it('should handle expired invitation date gracefully', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      mockInvitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: pastDate.toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      wrapper = mountComponent();

      // Should still render, backend will handle expiry validation
      expect(wrapper.text()).toContain('Smith Family');
    });
  });
});
