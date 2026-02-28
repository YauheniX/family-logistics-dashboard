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
        <!-- Avatar Selection for children (like Add Child modal) -->
        <div v-if="memberToEdit?.role === 'child'">
          <label class="label mb-3">Choose Avatar</label>
          <div class="grid grid-cols-4 gap-3">
            <button
              v-for="avatar in childAvatarOptions"
              :key="avatar.id"
              type="button"
              :aria-label="`Select ${avatar.label} avatar`"
              class="aspect-square rounded-full text-4xl transition-all border-4 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-400"
              :class="
                editMemberAvatar === avatar.emoji
                  ? 'border-green-500 bg-green-50 dark:bg-green-900 scale-110'
                  : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800'
              "
              @click="editMemberAvatar = avatar.emoji"
            >
              {{ avatar.emoji }}
            </button>
          </div>
        </div>

        <!-- Name field -->
        <div>
          <label class="label" for="edit-name">Name</label>
          <!-- Editable for children -->
          <input
            v-if="memberToEdit?.role === 'child'"
            id="edit-name"
            v-model="editMemberNameInput"
            type="text"
            class="input"
            placeholder="Enter child's name"
            required
          />
          <!-- Display only for adults -->
          <input
            v-else
            id="edit-name"
            :value="editMemberName"
            type="text"
            class="input bg-neutral-100 dark:bg-neutral-700 cursor-not-allowed"
            disabled
            readonly
          />
          <p
            v-if="memberToEdit?.role !== 'child'"
            class="mt-1 text-xs text-neutral-500 dark:text-neutral-400"
          >
            Name is displayed as shown on card
          </p>
        </div>

        <!-- Birthday for children (editable) -->
        <div v-if="memberToEdit?.role === 'child'">
          <label class="label" for="edit-birthday">Birthday</label>
          <input id="edit-birthday" v-model="editMemberBirthday" type="date" class="input" />
        </div>

        <!-- Email for adults (disabled) -->
        <div v-if="memberToEdit?.role !== 'child' && memberToEdit?.email">
          <label class="label" for="edit-email">Email</label>
          <input
            id="edit-email"
            :value="memberToEdit.email"
            type="email"
            class="input bg-neutral-100 dark:bg-neutral-700 cursor-not-allowed"
            disabled
            readonly
          />
        </div>

        <!-- Role field -->
        <div>
          <label class="label" for="edit-role">Role</label>
          <!-- Dropdown for adults (not children) -->
          <select
            v-if="memberToEdit?.role !== 'child'"
            id="edit-role"
            v-model="editMemberRole"
            class="input"
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
          <!-- Disabled for children -->
          <input
            v-else
            id="edit-role"
            value="Child"
            type="text"
            class="input bg-neutral-100 dark:bg-neutral-700 cursor-not-allowed"
            disabled
            readonly
          />
          <p
            v-if="memberToEdit?.role === 'child'"
            class="mt-1 text-xs text-neutral-500 dark:text-neutral-400"
          >
            Child role cannot be changed
          </p>
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
import { ref, computed, onMounted, onActivated, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import MemberCard from '@/components/members/MemberCard.vue';
import AddChildModal from '@/components/members/AddChildModal.vue';
import { useHouseholdEntityStore } from '@/features/household/presentation/household.store';
import { useHouseholdStore } from '@/stores/household';
import { useToastStore } from '@/stores/toast';
import { useMembers } from '@/composables/useMembers';
import { resolveMemberProfile } from '@/utils/profileResolver';
import type { Member } from '@/features/shared/domain/entities';

const route = useRoute();
const router = useRouter();
const householdEntityStore = useHouseholdEntityStore();
const householdStore = useHouseholdStore();
const toastStore = useToastStore();
const {
  loading: membersLoading,
  isOwnerOrAdmin,
  createChild,
  inviteMember: sendInvitation,
  removeMember: deleteHouseholdMember,
  updateMember,
} = useMembers();

const showAddChildModal = ref(false);
const showInviteMemberModal = ref(false);
const showRemoveModal = ref(false);
const showEditModal = ref(false);
const inviteEmail = ref('');
const inviteRole = ref<'member' | 'viewer' | 'admin'>('member');
const memberToRemove = ref<string | null>(null);
const memberToEdit = ref<Member | null>(null);
const editMemberName = ref(''); // Display only for adults
const editMemberNameInput = ref(''); // Editable for children
const editMemberRole = ref<'admin' | 'member' | 'viewer'>('member');
const editMemberAvatar = ref('');
const editMemberBirthday = ref('');

// Avatar options for children (same as Add Child modal)
const childAvatarOptions = [
  { id: 1, emoji: '👶', label: 'Baby' },
  { id: 2, emoji: '👧', label: 'Girl' },
  { id: 3, emoji: '👦', label: 'Boy' },
  { id: 4, emoji: '🧒', label: 'Child' },
  { id: 5, emoji: '👨', label: 'Man' },
  { id: 6, emoji: '👩', label: 'Woman' },
  { id: 7, emoji: '🐻', label: 'Bear' },
  { id: 8, emoji: '🐰', label: 'Rabbit' },
  { id: 9, emoji: '🐼', label: 'Panda' },
  { id: 10, emoji: '🦁', label: 'Lion' },
  { id: 11, emoji: '🐯', label: 'Tiger' },
  { id: 12, emoji: '🦊', label: 'Fox' },
  { id: 13, emoji: '🐨', label: 'Koala' },
  { id: 14, emoji: '🐸', label: 'Frog' },
  { id: 15, emoji: '🦄', label: 'Unicorn' },
  { id: 16, emoji: '🐶', label: 'Dog' },
];

const householdId = computed(() => {
  // Prefer route param (when navigating directly), fallback to global household context
  return (route.params.id as string) || householdStore.currentHousehold?.id || '';
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

// Track last loaded household to force refresh on navigation
let lastLoadedHouseholdId: string | null = null;

async function loadHouseholdData() {
  if (householdId.value && householdId.value !== lastLoadedHouseholdId) {
    await householdEntityStore.loadHousehold(householdId.value);
    lastLoadedHouseholdId = householdId.value;
  }
}

onMounted(async () => {
  await loadHouseholdData();
});

// Re-load data when component is activated (e.g., navigating back via browser back button)
onActivated(async () => {
  // Reset to force reload on navigation
  lastLoadedHouseholdId = null;
  await loadHouseholdData();
});

// Watch for household changes in route params
watch(
  () => route.params.id,
  async (newId) => {
    if (newId && newId !== lastLoadedHouseholdId) {
      await loadHouseholdData();
    }
  },
);

// Watch for household changes from HouseholdSwitcher dropdown
// Navigate to the new household's member page instead of loading in place
watch(
  () => householdStore.currentHousehold?.id,
  (newId) => {
    const currentRouteId = route.params.id as string;
    // Only navigate if we're on member-management page and household changed
    if (newId && currentRouteId && newId !== currentRouteId) {
      router.push(`/households/${newId}/members`);
    }
  },
);

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

  // Get display name using same logic as MemberCard
  const resolvedProfile = resolveMemberProfile(member);
  editMemberName.value = resolvedProfile.name;

  // Initialize editable name for children
  if (member.role === 'child') {
    editMemberNameInput.value = member.display_name || '';
  }

  // Initialize role for adults (set current role as default)
  if (member.role === 'admin' || member.role === 'member' || member.role === 'viewer') {
    editMemberRole.value = member.role;
  } else {
    // Fallback for any other role type
    editMemberRole.value = 'member';
  }

  // Initialize avatar for children
  editMemberAvatar.value = member.avatar_url || '';

  // Initialize birthday for children
  editMemberBirthday.value = member.date_of_birth || '';

  showEditModal.value = true;
};

const confirmEdit = async () => {
  if (!memberToEdit.value) return;

  // For children: update name, avatar, and birthday (role is immutable)
  // For adults: update role only (name, email are immutable)
  let success = false;

  if (memberToEdit.value.role === 'child') {
    // Validate that the trimmed name is not empty
    const trimmedName = editMemberNameInput.value.trim();
    if (!trimmedName) {
      toastStore.error('Name cannot be empty');
      return;
    }

    // Update child data (name, avatar, and birthday)
    success = await updateMember(memberToEdit.value.id, {
      display_name: trimmedName,
      avatar_url: editMemberAvatar.value,
      date_of_birth: editMemberBirthday.value,
    });
  } else {
    // Update adult role
    success = await updateMember(memberToEdit.value.id, {
      role: editMemberRole.value,
    });
  }

  if (success) {
    // Reload household data to refresh member list display
    await householdEntityStore.loadHousehold(householdId.value);

    showEditModal.value = false;
    memberToEdit.value = null;
    editMemberName.value = '';
    editMemberNameInput.value = '';
    editMemberRole.value = 'member';
    editMemberAvatar.value = '';
    editMemberBirthday.value = '';
  }
  // If update failed, keep modal open so user can retry
};
</script>
