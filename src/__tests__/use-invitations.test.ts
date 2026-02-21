import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useInvitations } from '@/composables/useInvitations';
import { useToastStore } from '@/stores/toast';

// Mock the Supabase client
vi.mock('@/features/shared/infrastructure/supabase.client', () => {
  const mockRpc = vi.fn();

  return {
    supabase: {
      rpc: mockRpc,
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null,
        }),
      },
      __mockRpc: mockRpc,
    },
  };
});

// Helper to get mocked supabase
async function getMockedSupabase() {
  const mod = await import('@/features/shared/infrastructure/supabase.client');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mod.supabase as any;
}

describe('useInvitations', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('fetchPendingInvitations', () => {
    it('should fetch invitations successfully', async () => {
      const { fetchPendingInvitations, invitations, loading, error } = useInvitations();
      const supabase = await getMockedSupabase();

      const mockInvitations = [
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

      supabase.__mockRpc.mockResolvedValue({
        data: mockInvitations,
        error: null,
      });

      await fetchPendingInvitations();

      expect(supabase.__mockRpc).toHaveBeenCalledWith('get_my_pending_invitations');
      expect(invitations.value).toEqual(mockInvitations);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
    });

    it('should handle empty invitation list', async () => {
      const { fetchPendingInvitations, invitations } = useInvitations();
      const supabase = await getMockedSupabase();

      supabase.__mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      await fetchPendingInvitations();

      expect(invitations.value).toEqual([]);
    });

    it('should handle RPC error', async () => {
      const { fetchPendingInvitations, invitations, error } = useInvitations();
      const supabase = await getMockedSupabase();

      const mockError = {
        message: 'Database connection failed',
        code: 'PGRST301',
        details: 'Connection timeout',
      };

      supabase.__mockRpc.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await fetchPendingInvitations();

      expect(invitations.value).toEqual([]);
      expect(error.value).toEqual(mockError);
    });

    it('should handle null data response', async () => {
      const { fetchPendingInvitations, invitations } = useInvitations();
      const supabase = await getMockedSupabase();

      supabase.__mockRpc.mockResolvedValue({
        data: null,
        error: null,
      });

      await fetchPendingInvitations();

      expect(invitations.value).toEqual([]);
    });

    it('should handle exception during fetch', async () => {
      const { fetchPendingInvitations, error } = useInvitations();
      const supabase = await getMockedSupabase();

      supabase.__mockRpc.mockRejectedValue(new Error('Network error'));

      await fetchPendingInvitations();

      expect(error.value).toEqual({
        message: 'Network error',
      });
    });

    it('should set loading state correctly', async () => {
      const { fetchPendingInvitations, loading } = useInvitations();
      const supabase = await getMockedSupabase();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let resolvePromise: ((value: any) => void) | undefined;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      supabase.__mockRpc.mockReturnValue(delayedPromise);

      const fetchPromise = fetchPendingInvitations();
      expect(loading.value).toBe(true);

      resolvePromise?.({ data: [], error: null });
      await fetchPromise;

      expect(loading.value).toBe(false);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      const { acceptInvitation, invitations } = useInvitations();
      const supabase = await getMockedSupabase();
      const toastStore = useToastStore();
      vi.spyOn(toastStore, 'success');

      invitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John Smith',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      supabase.__mockRpc.mockResolvedValue({
        data: 'new-member-id',
        error: null,
      });

      const result = await acceptInvitation('inv-1');

      expect(result).toBe(true);
      expect(invitations.value).toEqual([]);
      expect(toastStore.success).toHaveBeenCalledWith("Welcome! You've joined Smith Family 🎉");
    });

    it('should remove invitation from list after acceptance', async () => {
      const { acceptInvitation, invitations } = useInvitations();
      const supabase = await getMockedSupabase();

      invitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'House 1',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: 'inv-2',
          household_id: 'house-2',
          household_name: 'House 2',
          email: 'test@example.com',
          role: 'admin',
          invited_by_name: 'Jane',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      supabase.__mockRpc.mockResolvedValue({
        data: 'member-id',
        error: null,
      });

      await acceptInvitation('inv-1');

      expect(invitations.value).toHaveLength(1);
      expect(invitations.value[0].id).toBe('inv-2');
    });

    it('should handle RPC error during acceptance', async () => {
      const { acceptInvitation } = useInvitations();
      const supabase = await getMockedSupabase();
      const toastStore = useToastStore();
      vi.spyOn(toastStore, 'error');

      supabase.__mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'This invitation has expired', code: 'P0001' },
      });

      const result = await acceptInvitation('inv-1');

      expect(result).toBe(false);
      expect(toastStore.error).toHaveBeenCalledWith(
        'Failed to accept invitation: This invitation has expired',
      );
    });

    it('should handle exception during acceptance', async () => {
      const { acceptInvitation } = useInvitations();
      const supabase = await getMockedSupabase();
      const toastStore = useToastStore();
      vi.spyOn(toastStore, 'error');

      supabase.__mockRpc.mockRejectedValue(new Error('Network error'));

      const result = await acceptInvitation('inv-1');

      expect(result).toBe(false);
      expect(toastStore.error).toHaveBeenCalledWith('Failed to accept invitation');
    });

    it('should show generic household name if invitation not found', async () => {
      const { acceptInvitation } = useInvitations();
      const supabase = await getMockedSupabase();
      const toastStore = useToastStore();
      vi.spyOn(toastStore, 'success');

      supabase.__mockRpc.mockResolvedValue({
        data: 'member-id',
        error: null,
      });

      await acceptInvitation('unknown-inv-id');

      expect(toastStore.success).toHaveBeenCalledWith("Welcome! You've joined household 🎉");
    });
  });

  describe('declineInvitation', () => {
    it('should decline invitation successfully', async () => {
      const { declineInvitation, invitations } = useInvitations();
      const supabase = await getMockedSupabase();
      const toastStore = useToastStore();
      vi.spyOn(toastStore, 'info');

      invitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'Smith Family',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John Smith',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      supabase.__mockRpc.mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await declineInvitation('inv-1');

      expect(result).toBe(true);
      expect(invitations.value).toEqual([]);
      expect(toastStore.info).toHaveBeenCalledWith('Invitation declined');
    });

    it('should remove invitation from list after declining', async () => {
      const { declineInvitation, invitations } = useInvitations();
      const supabase = await getMockedSupabase();

      invitations.value = [
        {
          id: 'inv-1',
          household_id: 'house-1',
          household_name: 'House 1',
          email: 'test@example.com',
          role: 'member',
          invited_by_name: 'John',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: 'inv-2',
          household_id: 'house-2',
          household_name: 'House 2',
          email: 'test@example.com',
          role: 'admin',
          invited_by_name: 'Jane',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      supabase.__mockRpc.mockResolvedValue({
        data: true,
        error: null,
      });

      await declineInvitation('inv-2');

      expect(invitations.value).toHaveLength(1);
      expect(invitations.value[0].id).toBe('inv-1');
    });

    it('should handle RPC error during decline', async () => {
      const { declineInvitation } = useInvitations();
      const supabase = await getMockedSupabase();
      const toastStore = useToastStore();
      vi.spyOn(toastStore, 'error');

      supabase.__mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Invitation not found', code: 'P0001' },
      });

      const result = await declineInvitation('inv-1');

      expect(result).toBe(false);
      expect(toastStore.error).toHaveBeenCalledWith(
        'Failed to decline invitation: Invitation not found',
      );
    });

    it('should handle exception during decline', async () => {
      const { declineInvitation } = useInvitations();
      const supabase = await getMockedSupabase();
      const toastStore = useToastStore();
      vi.spyOn(toastStore, 'error');

      supabase.__mockRpc.mockRejectedValue(new Error('Connection lost'));

      const result = await declineInvitation('inv-1');

      expect(result).toBe(false);
      expect(toastStore.error).toHaveBeenCalledWith('Failed to decline invitation');
    });
  });

  describe('reactive state', () => {
    it('should return reactive refs', async () => {
      const { invitations, loading, error } = useInvitations();

      expect(invitations.value).toEqual([]);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();

      invitations.value = [
        {
          id: 'test',
          household_id: 'h1',
          household_name: 'Test',
          email: 'test@test.com',
          role: 'member',
          invited_by_name: 'Tester',
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      expect(invitations.value).toHaveLength(1);
    });

    it('should reset error state on new operation', async () => {
      const { fetchPendingInvitations, error } = useInvitations();
      const supabase = await getMockedSupabase();

      supabase.__mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Error 1', code: 'ERR1' },
      });
      await fetchPendingInvitations();
      expect(error.value).not.toBeNull();

      supabase.__mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });
      await fetchPendingInvitations();
      expect(error.value).toBeNull();
    });
  });
});
