<template>
  <div v-if="householdEntityStore.currentHousehold" class="space-y-6">
    <BaseCard>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div class="min-w-0">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">Household</p>
          <div class="flex items-center gap-2">
            <h2 class="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {{ householdEntityStore.currentHousehold.name }}
            </h2>
            <button
              v-if="canRename"
              type="button"
              class="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              title="Rename household"
              aria-label="Rename household"
              @click="openRenameModal"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          </div>
        </div>
        <div class="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
          <BaseButton
            class="w-full xs:w-auto"
            @click="router.push({ name: 'member-management', params: { id: props.id } })"
          >
            👥 Manage Members
          </BaseButton>
          <BaseButton
            v-if="isOwner"
            variant="danger"
            class="w-full xs:w-auto"
            @click="showDeleteModal = true"
          >
            Delete Household
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Members -->
      <BaseCard>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Members</h3>
          <span class="text-sm text-neutral-600 dark:text-neutral-300"
            >{{ householdEntityStore.members.length }} members</span
          >
        </div>
        <ul class="space-y-3">
          <li
            v-for="member in householdEntityStore.members"
            :key="member.id"
            class="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800"
          >
            <!-- Avatar -->
            <Avatar
              :avatar-url="member.avatar_url"
              :name="getMemberName(member)"
              :role="member.role"
              :size="40"
              :show-role-badge="false"
            />
            <div class="flex-1">
              <p class="font-medium text-neutral-800 dark:text-neutral-200">
                {{ getMemberName(member) }}
              </p>
              <BaseBadge :variant="member.role === 'owner' ? 'primary' : 'neutral'">
                {{ member.role }}
              </BaseBadge>
            </div>
          </li>
          <p
            v-if="!householdEntityStore.members.length"
            class="text-sm text-neutral-500 dark:text-neutral-400"
          >
            No members yet.
          </p>
        </ul>
      </BaseCard>
    </div>

    <!-- Invite Member Modal -->
    <ModalDialog :open="showInviteModal" title="Invite Member" @close="showInviteModal = false">
      <form class="space-y-4" @submit.prevent="handleInvite">
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
        <div class="flex gap-3">
          <BaseButton type="submit">Invite</BaseButton>
          <BaseButton variant="ghost" @click="showInviteModal = false">Cancel</BaseButton>
        </div>
      </form>
    </ModalDialog>

    <!-- Rename Household Modal -->
    <ModalDialog :open="showRenameModal" title="Rename Household" @close="showRenameModal = false">
      <form class="space-y-4" @submit.prevent="handleRename">
        <div>
          <label class="label" for="household-name">New name</label>
          <input
            id="household-name"
            v-model="newHouseholdName"
            class="input"
            required
            placeholder="Enter household name"
          />
        </div>
        <div class="flex gap-3">
          <BaseButton type="submit" :disabled="householdEntityStore.loading">Save</BaseButton>
          <BaseButton variant="ghost" @click="showRenameModal = false">Cancel</BaseButton>
        </div>
      </form>
    </ModalDialog>

    <!-- Delete Household Modal -->
    <ModalDialog :open="showDeleteModal" title="Delete Household" @close="showDeleteModal = false">
      <div class="space-y-4">
        <p class="text-sm text-neutral-600 dark:text-neutral-300">
          Delete <span class="font-semibold">{{ householdEntityStore.currentHousehold.name }}</span
          >? This action cannot be undone.
        </p>
        <div class="flex gap-3">
          <BaseButton
            variant="danger"
            :disabled="householdEntityStore.loading"
            @click="confirmDelete"
          >
            Delete
          </BaseButton>
          <BaseButton variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
        </div>
      </div>
    </ModalDialog>
  </div>
  <LoadingState v-else message="Loading household..." />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import Avatar from '@/components/shared/Avatar.vue';
import { useAuthStore } from '@/stores/auth';
import { useHouseholdEntityStore } from '@/features/household/presentation/household.store';
import { useHouseholdStore } from '@/stores/household';
import { useToastStore } from '@/stores/toast';
import { resolveMemberProfile } from '@/utils/profileResolver';
import type { Member } from '@/features/shared/domain/entities';

const props = defineProps<{ id: string }>();

const authStore = useAuthStore();
const householdEntityStore = useHouseholdEntityStore();
const householdStore = useHouseholdStore();
const toastStore = useToastStore();
const router = useRouter();

// Helper to resolve member display names
const getMemberName = (member: Member) => {
  const resolved = resolveMemberProfile(member);
  return resolved.name;
};

const showInviteModal = ref(false);
const showDeleteModal = ref(false);
const showRenameModal = ref(false);
const inviteEmail = ref('');
const newHouseholdName = ref('');

const isOwner = computed(() => {
  const userId = authStore.user?.id;
  const household = householdEntityStore.currentHousehold;

  if (!userId || !household) return false;
  if (household.created_by === userId) return true;

  return householdEntityStore.members.some(
    (member) => member.user_id === userId && member.role === 'owner',
  );
});

const canRename = computed(() => {
  const userId = authStore.user?.id;
  if (!userId) return false;
  // Owner/creator or admin can rename
  return (
    isOwner.value ||
    householdEntityStore.members.some(
      (member) => member.user_id === userId && member.role === 'admin',
    )
  );
});

const openRenameModal = () => {
  newHouseholdName.value = householdEntityStore.currentHousehold?.name || '';
  showRenameModal.value = true;
};

const handleRename = async () => {
  const trimmedName = newHouseholdName.value.trim();
  if (!trimmedName || !householdEntityStore.currentHousehold) return;

  const updated = await householdEntityStore.updateHousehold(
    householdEntityStore.currentHousehold.id,
    { name: trimmedName },
  );

  if (updated) {
    showRenameModal.value = false;
    // Also refresh the household list in the switcher
    if (authStore.user?.id) {
      await householdStore.initializeForUser(authStore.user.id);
    }
  } else {
    toastStore.error('Failed to rename household');
  }
};

const loadHouseholdData = async (householdId: string) => {
  await householdEntityStore.loadHousehold(householdId);
};

onMounted(async () => {
  await loadHouseholdData(props.id);
});

// Watch for route param changes (when switching households)
watch(
  () => props.id,
  async (newId) => {
    if (newId) {
      await loadHouseholdData(newId);
    }
  },
);

const handleInvite = async () => {
  if (!inviteEmail.value.trim()) return;
  const result = await householdEntityStore.inviteMember(
    props.id,
    inviteEmail.value.trim(),
    authStore.user?.id,
  );
  if (result) {
    inviteEmail.value = '';
    showInviteModal.value = false;
  }
};

const confirmDelete = async () => {
  if (!householdEntityStore.currentHousehold) {
    if (import.meta.env.DEV) {
      console.error('No current household to delete');
    }
    return;
  }

  if (import.meta.env.DEV) {
    console.log('Attempting to delete household:', householdEntityStore.currentHousehold.id);
    console.log('Current user:', authStore.user?.id);
    console.log('Is owner:', isOwner.value);
  }

  const deleted = await householdEntityStore.removeHousehold(
    householdEntityStore.currentHousehold.id,
  );

  if (import.meta.env.DEV) {
    console.log('Delete result:', deleted);
  }

  if (deleted) {
    showDeleteModal.value = false;

    // Refresh the main household store to update the switcher
    if (authStore.user?.id) {
      await householdStore.initializeForUser(authStore.user.id);
    }

    router.push('/households');
  } else if (import.meta.env.DEV) {
    console.error('Failed to delete household');
  }
};

// Watch for household changes and navigate to the new household detail page
watch(
  () => householdStore.currentHousehold,
  async (newHousehold, oldHousehold) => {
    // Only navigate if household actually changed and it's different from current route
    if (newHousehold && oldHousehold && newHousehold.id !== oldHousehold.id) {
      if (newHousehold.id !== props.id) {
        // Navigate to the new household's detail page
        await router.push({ name: 'household-detail', params: { id: newHousehold.id } });
      }
    }
  },
);
</script>
