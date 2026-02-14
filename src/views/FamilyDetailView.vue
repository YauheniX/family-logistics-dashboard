<template>
  <div v-if="familyStore.currentFamily" class="space-y-6">
    <div class="glass-card flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <p class="text-sm text-slate-500">Family</p>
        <h2 class="text-2xl font-semibold text-slate-900">{{ familyStore.currentFamily.name }}</h2>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-ghost" type="button" @click="showInviteModal = true">
          Invite Member
        </button>
        <RouterLink to="/families" class="btn-ghost">← Back</RouterLink>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Members -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-900">Members</h3>
          <span class="text-sm text-slate-600">{{ familyStore.members.length }} members</span>
        </div>
        <ul class="mt-3 space-y-2">
          <li
            v-for="member in familyStore.members"
            :key="member.id"
            class="flex items-center justify-between text-sm"
          >
            <div>
              <p class="font-medium text-slate-800">
                {{ member.display_name || member.email || member.user_id }}
              </p>
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="
                  member.role === 'owner'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                "
              >
                {{ member.role }}
              </span>
            </div>
            <button
              v-if="member.role !== 'owner'"
              type="button"
              class="btn-ghost text-sm text-red-600 hover:text-red-800"
              @click="familyStore.removeMember(member.id)"
            >
              Remove
            </button>
          </li>
          <p v-if="!familyStore.members.length" class="text-sm text-slate-500">No members yet.</p>
        </ul>
      </div>

      <!-- Shopping Lists -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-900">Shopping Lists</h3>
          <button class="btn-ghost text-sm" type="button" @click="showCreateListModal = true">
            + New List
          </button>
        </div>
        <div v-if="shoppingStore.lists.length" class="mt-3 space-y-2">
          <RouterLink
            v-for="list in shoppingStore.lists"
            :key="list.id"
            :to="{ name: 'shopping-list', params: { listId: list.id } }"
            class="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm hover:bg-slate-50"
          >
            <div>
              <p class="font-medium text-slate-800">{{ list.title }}</p>
              <p v-if="list.description" class="text-xs text-slate-500">{{ list.description }}</p>
            </div>
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              :class="
                list.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              "
            >
              {{ list.status }}
            </span>
          </RouterLink>
        </div>
        <p v-else class="mt-3 text-sm text-slate-500">No shopping lists yet.</p>
      </div>
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
          <button class="btn-primary" type="submit">Invite</button>
          <button class="btn-ghost" type="button" @click="showInviteModal = false">Cancel</button>
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
          <button class="btn-primary" type="submit" :disabled="shoppingStore.loading">
            Create
          </button>
          <button class="btn-ghost" type="button" @click="showCreateListModal = false">
            Cancel
          </button>
        </div>
      </form>
    </ModalDialog>
  </div>
  <LoadingState v-else message="Loading family..." />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import LoadingState from '@/components/shared/LoadingState.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useFamilyStore } from '@/features/family/presentation/family.store';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';

const props = defineProps<{ id: string }>();

const authStore = useAuthStore();
const familyStore = useFamilyStore();
const shoppingStore = useShoppingStore();

const showInviteModal = ref(false);
const showCreateListModal = ref(false);
const inviteEmail = ref('');
const newListTitle = ref('');
const newListDescription = ref('');

onMounted(async () => {
  await familyStore.loadFamily(props.id);
  await shoppingStore.loadLists(props.id);
});

const handleInvite = async () => {
  if (!inviteEmail.value.trim()) return;
  const result = await familyStore.inviteMember(
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
    family_id: props.id,
    title: newListTitle.value.trim(),
    description: newListDescription.value.trim() || null,
  });
  if (result) {
    newListTitle.value = '';
    newListDescription.value = '';
    showCreateListModal.value = false;
  }
};
</script>
