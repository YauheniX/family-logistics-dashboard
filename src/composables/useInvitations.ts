import { ref, type Ref } from 'vue';
import { supabase } from '@/features/shared/infrastructure/supabase.client';
import { useToastStore } from '@/stores/toast';
import type { ApiError } from '@/features/shared/domain/repository.interface';

export interface PendingInvitation {
  id: string;
  household_id: string;
  household_name: string;
  email: string;
  role: string;
  invited_by_name: string;
  expires_at: string;
  created_at: string;
}

export interface UseInvitationsReturn {
  invitations: Ref<PendingInvitation[]>;
  loading: Ref<boolean>;
  error: Ref<ApiError | null>;
  fetchPendingInvitations: () => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<boolean>;
  declineInvitation: (invitationId: string) => Promise<boolean>;
}

/**
 * Composable for managing user invitations
 * Allows users to view, accept, and decline invitations without email
 */
export function useInvitations(): UseInvitationsReturn {
  const invitations = ref<PendingInvitation[]>([]);
  const loading = ref(false);
  const error = ref<ApiError | null>(null);
  const toastStore = useToastStore();

  /**
   * Fetch pending invitations for the current user
   */
  async function fetchPendingInvitations(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      // Type assertion needed: custom RPC function not in generated types
      const { data, error: rpcError } = await supabase.rpc('get_my_pending_invitations');

      if (rpcError) {
        error.value = {
          message: rpcError.message,
          code: rpcError.code,
          details: rpcError.details,
        };
        console.error('Failed to fetch invitations:', rpcError);
        return;
      }

      invitations.value = (data || []) as PendingInvitation[];
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : 'Failed to fetch invitations',
      };
      console.error('Failed to fetch invitations:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Accept an invitation and join the household
   */
  async function acceptInvitation(invitationId: string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      // Type assertion needed: custom RPC function not in generated types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: rpcError } = await (supabase as any).rpc('accept_invitation', {
        p_invitation_id: invitationId,
      });

      if (rpcError) {
        error.value = {
          message: rpcError.message,
          code: rpcError.code,
          details: rpcError.details,
        };
        toastStore.error(`Failed to accept invitation: ${rpcError.message}`);
        return false;
      }

      // Remove accepted invitation from list
      const invitationData = invitations.value.find((inv) => inv.id === invitationId);
      invitations.value = invitations.value.filter((inv) => inv.id !== invitationId);

      const householdName = invitationData?.household_name || 'household';

      toastStore.success(`Welcome! You've joined ${householdName} 🎉`);
      return true;
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : 'Failed to accept invitation',
      };
      toastStore.error('Failed to accept invitation');
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Decline an invitation
   */
  async function declineInvitation(invitationId: string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      // Type assertion needed: custom RPC function not in generated types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: rpcError } = await (supabase as any).rpc('decline_invitation', {
        p_invitation_id: invitationId,
      });

      if (rpcError) {
        error.value = {
          message: rpcError.message,
          code: rpcError.code,
          details: rpcError.details,
        };
        toastStore.error(`Failed to decline invitation: ${rpcError.message}`);
        return false;
      }

      // Remove declined invitation from list
      invitations.value = invitations.value.filter((inv) => inv.id !== invitationId);

      toastStore.info('Invitation declined');
      return true;
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : 'Failed to decline invitation',
      };
      toastStore.error('Failed to decline invitation');
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    invitations,
    loading,
    error,
    fetchPendingInvitations,
    acceptInvitation,
    declineInvitation,
  };
}
