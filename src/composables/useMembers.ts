import { ref, computed } from 'vue';
import { memberRepository } from '@/features/household/infrastructure/household.factory';
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
      const response = await memberRepository.getMembersWithProfiles(householdId);

      if (response.error) {
        error.value = {
          message: response.error.message,
          code: response.error.code,
          details: response.error.details,
        };
        toastStore.error('Failed to load members');
        return;
      }

      members.value = response.data ?? [];
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
      const response = await memberRepository.createChild(
        householdId,
        data.name,
        data.birthday,
        data.avatar ?? null,
      );

      if (response.error) {
        error.value = {
          message: response.error.message,
          code: response.error.code,
          details: response.error.details,
        };
        toastStore.error(`Failed to add child: ${response.error.message}`);
        return null;
      }

      // Fetch the newly created member by ID
      const memberId = response.data!;
      const memberResult = await memberRepository.findById(memberId);

      if (memberResult.error || !memberResult.data) {
        // Fallback: refresh the list
        await fetchMembers();
        toastStore.success(`${data.name} has been added to the family! 👶`);
        return null;
      }

      // Refresh the full list to show the new child
      await fetchMembers();
      toastStore.success(`${data.name} has been added to the family! 👶`);
      return memberResult.data;
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
      const response = await memberRepository.sendInvitation(householdId, email, role);

      if (response.error) {
        error.value = {
          message: response.error.message,
          code: response.error.code,
          details: response.error.details,
        };
        toastStore.error(`Failed to invite member: ${response.error.message}`);
        return null;
      }

      // Fetch the newly created invitation by ID
      const invitationId = response.data!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: invitation, error: fetchError } = await (supabase as any)
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError || !invitation) {
        // Fallback: just show success message
        toastStore.success(`Invitation sent to ${email}! 📧`);
        return null;
      }

      toastStore.success(`Invitation sent to ${email}! 📧`);
      return invitation as Invitation;
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
   * Remove a member from the current household (soft delete)
   */
  async function removeMember(memberId: string): Promise<boolean> {
    if (!isOwnerOrAdmin.value) {
      toastStore.error('Only owners and admins can remove members');
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await memberRepository.softDelete(memberId);

      if (response.error) {
        error.value = {
          message: response.error.message,
          code: response.error.code,
          details: response.error.details,
        };
        toastStore.error('Failed to remove member');
        return false;
      }

      // Refresh list after removal
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
