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
          <BaseButton @click="showInviteMemberModal = true">
            ➕ Invite Member
          </BaseButton>
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
        <div>
          <label class="label" for="invite-role">Role</label>
          <select id="invite-role" v-model="inviteRole" class="input">
            <option value="member">Member</option>
            <option value="viewer">Viewer (e.g., Grandparent)</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="flex gap-3">
          <BaseButton type="submit">Send Invitation</BaseButton>
          <BaseButton variant="ghost" type="button" @click="showInviteMemberModal = false">
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
import type { FamilyMember } from '@/features/shared/domain/entities';

const route = useRoute();
const familyStore = useFamilyStore();
const authStore = useAuthStore();

const showAddChildModal = ref(false);
const showInviteMemberModal = ref(false);
const inviteEmail = ref('');
const inviteRole = ref<'member' | 'viewer' | 'admin'>('member');

const familyId = computed(() => {
  return route.params.id as string || familyStore.currentFamily?.id || '';
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

const handleAddChild = async (childData: {
  name: string;
  birthday: string;
  avatar: string;
}) => {
  // TODO: Integrate with actual member service when implemented
  console.log('Adding child:', childData);
  
  // For now, simulate adding a child member to the family store
  // This will need to be replaced with actual API call
  showAddChildModal.value = false;
  
  // TODO: Call familyStore method to add child member
  // await familyStore.addChildMember(familyId.value, childData);
};

const handleInviteMember = async () => {
  if (!inviteEmail.value.trim()) return;
  
  const result = await familyStore.inviteMember(
    familyId.value,
    inviteEmail.value.trim(),
    authStore.user?.id
  );
  
  if (result) {
    inviteEmail.value = '';
    inviteRole.value = 'member';
    showInviteMemberModal.value = false;
  }
};

const handleRemoveMember = async (memberId: string) => {
  if (confirm('Are you sure you want to remove this member?')) {
    await familyStore.removeMember(memberId);
  }
};

const handleEditMember = (member: FamilyMember) => {
  // TODO: Implement edit functionality
  console.log('Edit member:', member);
};
</script>
