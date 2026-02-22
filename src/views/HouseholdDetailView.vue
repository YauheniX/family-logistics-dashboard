<template>
  <div v-if="householdEntityStore.currentHousehold" class="space-y-6">
    <BaseCard>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div v-if="hasMultipleHouseholds">
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Household</p>
          <HouseholdSwitcher />
        </div>
        <div v-else>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">Household</p>
          <h2 class="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {{ householdEntityStore.currentHousehold.name }}
          </h2>
        </div>
        <div class="flex flex-wrap gap-2">
          <BaseButton @click="router.push({ name: 'member-management', params: { id: props.id } })">
            👥 Manage Members
          </BaseButton>
          <BaseButton v-if="isOwner" variant="danger" @click="showDeleteModal = true">
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
              :name="member.display_name || member.email || member.user_id || 'User'"
              :role="member.role"
              :size="40"
            />
            <div class="flex-1">
              <p class="font-medium text-neutral-800 dark:text-neutral-200">
                {{ member.display_name || member.email || member.user_id }}
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

      <!-- Shopping Lists -->
      <BaseCard>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Shopping Lists
          </h3>
          <BaseButton variant="ghost" @click="showCreateListModal = true"> + New List </BaseButton>
        </div>
        <div v-if="shoppingStore.lists.length" class="space-y-2">
          <RouterLink
            v-for="list in shoppingStore.lists"
            :key="list.id"
            :to="{ name: 'shopping-list', params: { listId: list.id } }"
            class="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <div>
              <p class="font-medium text-neutral-800 dark:text-neutral-200">{{ list.title }}</p>
              <p v-if="list.description" class="text-xs text-neutral-500 dark:text-neutral-400">
                {{ list.description }}
              </p>
            </div>
            <BaseBadge :variant="list.status === 'active' ? 'success' : 'neutral'">
              {{ list.status }}
            </BaseBadge>
          </RouterLink>
        </div>
        <p v-else class="text-sm text-neutral-500 dark:text-neutral-400">No shopping lists yet.</p>
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

    <!-- Create Shopping List Modal -->
    <ModalDialog
      :open="showCreateListModal"
      title="New Shopping List"
      @close="showCreateListModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleCreateList">
        <div>
          <label class="label" for="list-title">Title</label>
          <input
            id="list-title"
            v-model="newListTitle"
            class="input"
            required
            placeholder="Weekly groceries"
          />
        </div>
        <div>
          <label class="label" for="list-description">Description</label>
          <input
            id="list-description"
            v-model="newListDescription"
            class="input"
            placeholder="Optional description"
          />
        </div>
        <div class="flex gap-3">
          <BaseButton type="submit" :disabled="shoppingStore.loading"> Create </BaseButton>
          <BaseButton variant="ghost" @click="showCreateListModal = false"> Cancel </BaseButton>
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
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import HouseholdSwitcher from '@/components/layout/HouseholdSwitcher.vue';
import Avatar from '@/components/shared/Avatar.vue';
import { useAuthStore } from '@/stores/auth';
import { useHouseholdEntityStore } from '@/features/household/presentation/household.store';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';
import { useHouseholdStore } from '@/stores/household';

const props = defineProps<{ id: string }>();

const authStore = useAuthStore();
const householdEntityStore = useHouseholdEntityStore();
const householdStore = useHouseholdStore();
const shoppingStore = useShoppingStore();
const router = useRouter();

const hasMultipleHouseholds = computed(() => householdStore.households.length > 1);

const showInviteModal = ref(false);
const showCreateListModal = ref(false);
const showDeleteModal = ref(false);
const inviteEmail = ref('');
const newListTitle = ref('');
const newListDescription = ref('');

const isOwner = computed(() => {
  const userId = authStore.user?.id;
  const household = householdEntityStore.currentHousehold;

  if (!userId || !household) return false;
  if (household.created_by === userId) return true;

  return householdEntityStore.members.some(
    (member) => member.user_id === userId && member.role === 'owner',
  );
});

onMounted(async () => {
  await householdEntityStore.loadHousehold(props.id);
  await shoppingStore.loadLists(props.id);
});

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

const handleCreateList = async () => {
  if (!newListTitle.value.trim()) return;
  const result = await shoppingStore.createList({
    household_id: props.id,
    title: newListTitle.value.trim(),
    description: newListDescription.value.trim() || null,
  });
  if (result) {
    // Set the newly created list as the current shopping list and navigate to it
    shoppingStore.currentList = result;
    newListTitle.value = '';
    newListDescription.value = '';
    showCreateListModal.value = false;
    router.push({ name: 'shopping-list', params: { listId: result.id } });
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
    router.push('/households');
  } else if (import.meta.env.DEV) {
    console.error('Failed to delete household');
  }
};
</script>
