<template>
  <div class="space-y-6">
    <!-- Header -->
    <BaseCard>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div class="min-w-0">
          <p class="text-sm text-neutral-500 dark:text-neutral-400 truncate">
            {{
              householdStore.currentHousehold?.name ||
              householdEntityStore.currentHousehold?.name ||
              'Household'
            }}
          </p>
          <h2 class="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Household Members
          </h2>
        </div>
        <div v-if="isOwnerOrAdmin" class="flex flex-col xs:flex-row gap-2">
          <BaseButton
            variant="primary"
            :disabled="membersLoading"
            class="w-full xs:w-auto"
            @click="showAddChildModal = true"
          >
            👶 Add Child
          </BaseButton>
          <BaseButton
            :disabled="membersLoading"
            class="w-full xs:w-auto"
            @click="showInviteMemberModal = true"
          >
            ➕ Invite Member
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- Loading State -->
    <div v-if="membersLoading" class="flex justify-center py-8">
      <p class="text-neutral-500 dark:text-neutral-400">Loading members...</p>
    </div>

    <!-- Members Grid -->
    <div v-else-if="displayMembers.length > 0" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <MemberCard
        v-for="member in displayMembers"
        :key="member.id"
        :member="member"
        :can-manage="isOwnerOrAdmin"
        @remove="handleRemoveMember"
        @edit="handleEditMember"
      />
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else
      badge="Getting Started"
      title="No household members yet"
      description="Start by adding children or inviting other household members to your household."
      cta="Add Your First Child"
      @action="showAddChildModal = true"
    />

    <!-- Add Child Modal -->
    <AddChildModal
      :open="showAddChildModal"
      @close="showAddChildModal = false"
      @submit="handleAddChild"
    />

    <!-- Invite Member Modal -->
    <ModalDialog
      :open="showInviteMemberModal"
      title="Invite Household Member"
      @close="showInviteMemberModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleInviteMember">
        <div>
          <label class="label" for="invite-email">Email address</label>
          <input
            id="invite-email"
            v-model="inviteEmail"
            type="email"
            class="input"
            required
            placeholder="member@example.com"
          />
        </div>
        <div>
          <label class="label" for="invite-role">Role</label>
          <select id="invite-role" v-model="inviteRole" class="input">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <div class="flex gap-3">
          <BaseButton type="submit" :loading="membersLoading">Send Invitation</BaseButton>
          <BaseButton variant="ghost" type="button" @click="showInviteMemberModal = false">
            Cancel
          </BaseButton>
        </div>
      </form>
    </ModalDialog>

    <!-- Confirm Remove Modal -->
    <ModalDialog :open="showRemoveModal" title="Remove Member" @close="showRemoveModal = false">
      <div class="space-y-4">
        <p class="text-sm text-neutral-600 dark:text-neutral-300">
          Are you sure you want to remove this member? This action cannot be undone.
        </p>
        <div class="flex gap-3">
          <BaseButton variant="danger" :loading="membersLoading" @click="confirmRemove">
            Remove
          </BaseButton>
          <BaseButton variant="ghost" @click="showRemoveModal = false"> Cancel </BaseButton>
        </div>
      </div>
    </ModalDialog>

    <!-- Edit Member Modal -->
    <ModalDialog :open="showEditModal" title="Edit Member" @close="showEditModal = false">
      <form class="space-y-4" @submit.prevent="confirmEdit">
        <div>
          <label class="label" for="edit-name">Name</label>
          <input
            id="edit-name"
            v-model="editMemberName"
            type="text"
            class="input"
            required
            placeholder="Member name"
          />
        </div>
        <div class="flex gap-3">
          <BaseButton type="submit">Save Changes</BaseButton>
          <BaseButton variant="ghost" type="button" @click="showEditModal = false">
            Cancel
          </BaseButton>
        </div>
      </form>
    </ModalDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import MemberCard from '@/components/members/MemberCard.vue';
import AddChildModal from '@/components/members/AddChildModal.vue';
import { useHouseholdEntityStore } from '@/features/household/presentation/household.store';
import { useHouseholdStore } from '@/stores/household';
import { useMembers } from '@/composables/useMembers';
import type { Member } from '@/features/shared/domain/entities';

const route = useRoute();
const householdEntityStore = useHouseholdEntityStore();
const householdStore = useHouseholdStore();
const {
  loading: membersLoading,
  isOwnerOrAdmin,
  createChild,
  inviteMember: sendInvitation,
  removeMember: deleteHouseholdMember,
} = useMembers();

const showAddChildModal = ref(false);
const showInviteMemberModal = ref(false);
const showRemoveModal = ref(false);
const showEditModal = ref(false);
const inviteEmail = ref('');
const inviteRole = ref<'member' | 'viewer' | 'admin'>('member');
const memberToRemove = ref<string | null>(null);
const memberToEdit = ref<Member | null>(null);
const editMemberName = ref('');

const householdId = computed(() => {
  return (route.params.id as string) || householdEntityStore.currentHousehold?.id || '';
});

// Sort members: owner first, then adults, then children, then viewers
const displayMembers = computed(() => {
  // Always use householdEntityStore.members for consistency with household detail view
  const memberList = [...householdEntityStore.members];

  const roleOrder: Record<string, number> = {
    owner: 0,
    admin: 1,
    member: 2,
    child: 3,
    viewer: 4,
  };

  return memberList.sort((a, b) => {
    const roleA = roleOrder[a.role] ?? 999;
    const roleB = roleOrder[b.role] ?? 999;
    return roleA - roleB;
  });
});

onMounted(async () => {
  // Always load via householdEntityStore for consistency
  if (householdId.value) {
    await householdEntityStore.loadHousehold(householdId.value);
  }
});

const handleAddChild = async (childData: { name: string; birthday: string; avatar: string }) => {
  showAddChildModal.value = false;

  const result = await createChild(childData);

  if (result) {
    // Refresh member list after successful creation
    if (householdId.value) {
      await householdEntityStore.loadHousehold(householdId.value);
    }
  }
};

const handleInviteMember = async () => {
  if (!inviteEmail.value.trim()) return;

  const result = await sendInvitation(inviteEmail.value.trim(), inviteRole.value);

  if (result) {
    inviteEmail.value = '';
    inviteRole.value = 'member';
    showInviteMemberModal.value = false;
  }
};

const handleRemoveMember = (memberId: string) => {
  memberToRemove.value = memberId;
  showRemoveModal.value = true;
};

const confirmRemove = async () => {
  if (memberToRemove.value) {
    const success = await deleteHouseholdMember(memberToRemove.value);
    if (success) {
      // Reload household to refresh member list
      if (householdId.value) {
        await householdEntityStore.loadHousehold(householdId.value);
      }
      memberToRemove.value = null;
      showRemoveModal.value = false;
    }
  }
};

const handleEditMember = (member: Member) => {
  memberToEdit.value = member;
  editMemberName.value = member.display_name || '';
  showEditModal.value = true;
};

const confirmEdit = async () => {
  if (!memberToEdit.value || !editMemberName.value.trim()) return;

  // TODO: Implement actual update via member service
  console.log('Updating member:', memberToEdit.value.id, 'with name:', editMemberName.value);
  console.warn('TODO: Integrate with member service to update member details.');

  showEditModal.value = false;
  memberToEdit.value = null;
  editMemberName.value = '';
};
</script>
