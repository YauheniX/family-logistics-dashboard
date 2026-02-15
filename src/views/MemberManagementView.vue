<template>
  <div class="space-y-6">
    <!-- Header -->
    <BaseCard>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ familyStore.currentFamily?.name || 'Family' }}
          </p>
          <h2 class="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Family Members
          </h2>
        </div>
        <div class="flex flex-wrap gap-2">
          <BaseButton variant="primary" @click="showAddChildModal = true">
            👶 Add Child
          </BaseButton>
          <BaseButton @click="showInviteMemberModal = true"> ➕ Invite Member </BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- Members Grid -->
    <div v-if="familyStore.members.length > 0" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <MemberCard
        v-for="member in sortedMembers"
        :key="member.id"
        :member="member"
        @remove="handleRemoveMember"
        @edit="handleEditMember"
      />
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else
      badge="Getting Started"
      title="No family members yet"
      description="Start by adding children or inviting other family members to your household."
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
      title="Invite Family Member"
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
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Note: Role selection will be available once role-based invitations are implemented.
          Currently, all invitations default to "Member" role.
        </p>
        <div class="flex gap-3">
          <BaseButton type="submit">Send Invitation</BaseButton>
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
          <BaseButton variant="danger" @click="confirmRemove"> Remove </BaseButton>
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
import { useFamilyStore } from '@/features/family/presentation/family.store';
import { useAuthStore } from '@/stores/auth';
import type { Member } from '@/features/shared/domain/entities';

const route = useRoute();
const familyStore = useFamilyStore();
const authStore = useAuthStore();

const showAddChildModal = ref(false);
const showInviteMemberModal = ref(false);
const showRemoveModal = ref(false);
const showEditModal = ref(false);
const inviteEmail = ref('');
const inviteRole = ref<'member' | 'viewer' | 'admin'>('member');
const memberToRemove = ref<string | null>(null);
const memberToEdit = ref<Member | null>(null);
const editMemberName = ref('');

const familyId = computed(() => {
  return (route.params.id as string) || familyStore.currentFamily?.id || '';
});

// Sort members: owner first, then adults, then children, then viewers
const sortedMembers = computed(() => {
  const members = [...familyStore.members];
  const roleOrder: Record<string, number> = {
    owner: 0,
    admin: 1,
    member: 2,
    child: 3,
    viewer: 4,
  };

  return members.sort((a, b) => {
    const roleA = roleOrder[a.role] ?? 999;
    const roleB = roleOrder[b.role] ?? 999;
    return roleA - roleB;
  });
});

onMounted(async () => {
  if (familyId.value) {
    await familyStore.loadFamily(familyId.value);
  }
});

const handleAddChild = async (childData: { name: string; birthday: string; avatar: string }) => {
  // Close the modal immediately so the UI reflects that the action was attempted
  showAddChildModal.value = false;

  // Prepare the payload in the shape expected for a child Member entity.
  // Note: This only documents the intended structure; the actual persistence
  // logic should be implemented in a family/member service or store method.
  const memberPayload = {
    display_name: childData.name,
    date_of_birth: childData.birthday,
    avatar_url: childData.avatar,
    household_id: familyId.value,
    role: 'child' as const,
    user_id: null,
  };

  // For now, make the lack of implementation explicit rather than silently
  // failing, to avoid the "Add Child" feature appearing to work when it does not.
  console.error('handleAddChild is not implemented. Intended payload:', memberPayload);
  console.warn('TODO: Integrate with member service to create a child member.');

  // TODO: Call member service method to add child member
  // await memberService.createMember(memberPayload);
};

const handleInviteMember = async () => {
  if (!inviteEmail.value.trim()) return;

  // TODO: Pass inviteRole.value to the service when role-based invitations are supported
  // Currently, the existing inviteMember method only supports basic member invitations
  const result = await familyStore.inviteMember(
    familyId.value,
    inviteEmail.value.trim(),
    authStore.user?.id,
  );

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
    await familyStore.removeMember(memberToRemove.value);
    memberToRemove.value = null;
    showRemoveModal.value = false;
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

  // TODO: Call member service method to update member
  // await memberService.updateMember(memberToEdit.value.id, {
  //   display_name: editMemberName.value.trim()
  // });

  showEditModal.value = false;
  memberToEdit.value = null;
  editMemberName.value = '';
};
</script>
