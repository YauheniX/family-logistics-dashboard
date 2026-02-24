import { ref, computed } from 'vue';
import { supabase } from '@/features/shared/infrastructure/supabase.client';
import { useHouseholdStore } from '@/stores/household';
import { useToastStore } from '@/stores/toast';
import type { Member, Invitation } from '@/features/shared/domain/entities';
import type { ApiError } from '@/types/api';

export interface UseMembersReturn {
  members: ReturnType<typeof ref<Member[]>>;
  loading: ReturnType<typeof ref<boolean>>;
  error: ReturnType<typeof ref<ApiError | null>>;
  isOwnerOrAdmin: ReturnType<typeof computed<boolean>>;
  fetchMembers: () => Promise<void>;
  createChild: (data: { name: string; birthday: string; avatar: string }) => Promise<Member | null>;
  inviteMember: (email: string, role?: string) => Promise<Invitation | null>;
  removeMember: (memberId: string) => Promise<boolean>;
}

/**
 * Composable for managing household members.
 * Provides CRUD operations with loading/error states and toast feedback.
 */
export function useMembers(): UseMembersReturn {
  const members = ref<Member[]>([]);
  const loading = ref(false);
  const error = ref<ApiError | null>(null);

  const householdStore = useHouseholdStore();
  const toastStore = useToastStore();

  const isOwnerOrAdmin = computed(() => householdStore.isOwnerOrAdmin);

  /**
   * Fetch all members for the current household
   */
  async function fetchMembers(): Promise<void> {
    const householdId = householdStore.currentHousehold?.id;
    if (!householdId) {
      members.value = [];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const { data, error: queryError } = await supabase
        .from('members')
        .select(
          `
          *,
          user_profiles!user_id(avatar_url)
        `,
        )
        .eq('household_id', householdId)
        .eq('is_active', true)
        .order('joined_at');

      if (queryError) {
        error.value = {
          message: queryError.message,
          code: queryError.code,
          details: queryError.details,
        };
        toastStore.error('Failed to load members');
        return;
      }

      members.value = (data ?? []) as unknown as Member[];
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : 'Failed to load members',
      };
      toastStore.error('Failed to load members');
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a child member in the current household
   */
  async function createChild(data: {
    name: string;
    birthday: string;
    avatar: string;
  }): Promise<Member | null> {
    const householdId = householdStore.currentHousehold?.id;
    if (!householdId) {
      toastStore.error('No household selected');
      return null;
    }

    if (!isOwnerOrAdmin.value) {
      toastStore.error('Only owners and admins can add children');
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const { data: memberId, error: rpcError } = await supabase.rpc('create_child_member', {
        p_household_id: householdId,
        p_name: data.name,
        p_date_of_birth: data.birthday,
        p_avatar_url: data.avatar ?? null,
      });

      if (rpcError) {
        error.value = {
          message: rpcError.message,
          code: rpcError.code,
          details: rpcError.details,
        };
        toastStore.error(`Failed to add child: ${rpcError.message}`);
        return null;
      }

      // Fetch the created member
      const { data: newMember, error: fetchError } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (fetchError || !newMember) {
        // Member was created but couldn't be fetched directly; refresh the full list
        await fetchMembers();
        toastStore.success(`${data.name} has been added to the family! 👶`);
        return null;
      }

      // Refresh the full list to avoid race conditions with concurrent operations
      await fetchMembers();
      toastStore.success(`${data.name} has been added to the family! 👶`);
      return newMember as unknown as Member;
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : 'Failed to add child',
      };
      toastStore.error('Failed to add child member');
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Invite a member to the current household by email
   */
  async function inviteMember(email: string, role: string = 'member'): Promise<Invitation | null> {
    const householdId = householdStore.currentHousehold?.id;
    if (!householdId) {
      toastStore.error('No household selected');
      return null;
    }

    if (!isOwnerOrAdmin.value) {
      toastStore.error('Only owners and admins can invite members');
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const { data: invitationId, error: rpcError } = await supabase.rpc('invite_member', {
        p_household_id: householdId,
        p_email: email,
        p_role: role,
      });

      if (rpcError) {
        error.value = {
          message: rpcError.message,
          code: rpcError.code,
          details: rpcError.details,
        };
        toastStore.error(`Failed to invite member: ${rpcError.message}`);
        return null;
      }

      // Fetch the created invitation
      const { data: invitation, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError || !invitation) {
        toastStore.success(`Invitation sent to ${email}! 📧`);
        return null;
      }

      toastStore.success(`Invitation sent to ${email}! 📧`);
      return invitation as unknown as Invitation;
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : 'Failed to send invitation',
      };
      toastStore.error('Failed to send invitation');
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Remove a member from the current household
   */
  async function removeMember(memberId: string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      const { error: updateError } = await supabase
        .from('members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (updateError) {
        error.value = {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
        };
        toastStore.error(`Failed to remove member: ${updateError.message}`);
        return false;
      }

      // Refresh the full list to stay consistent
      await fetchMembers();
      toastStore.success('Member removed successfully');
      return true;
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : 'Failed to remove member',
      };
      toastStore.error('Failed to remove member');
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    members,
    loading,
    error,
    isOwnerOrAdmin,
    fetchMembers,
    createChild,
    inviteMember,
    removeMember,
  };
}
