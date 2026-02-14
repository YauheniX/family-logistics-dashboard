<template>
  <ModalDialog :open="open" title="Share Trip" @close="$emit('close')">
    <div class="space-y-4">
      <!-- Invite form (owner only) -->
      <form v-if="isOwner" class="space-y-2" @submit.prevent="handleInvite">
        <label class="label">Invite by email</label>
        <div class="flex gap-2">
          <input
            v-model="inviteEmail"
            type="email"
            class="input flex-1"
            placeholder="user@example.com"
            required
          />
          <select v-model="inviteRole" class="input w-28">
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button type="submit" class="btn-primary" :disabled="inviting">
            {{ inviting ? '...' : 'Invite' }}
          </button>
        </div>
        <p v-if="inviteError" class="text-sm text-red-600">{{ inviteError }}</p>
        <p v-if="inviteSuccess" class="text-sm text-emerald-600">{{ inviteSuccess }}</p>
      </form>

      <!-- Members list -->
      <div>
        <h4 class="label mb-2">Members</h4>

        <!-- Owner -->
        <div class="flex items-center justify-between rounded-lg border border-slate-200 p-3">
          <div>
            <p class="text-sm font-medium text-slate-900">{{ ownerEmail }}</p>
          </div>
          <span class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
            Owner
          </span>
        </div>

        <!-- Shared members -->
        <div
          v-for="member in members"
          :key="member.id"
          class="mt-2 flex items-center justify-between rounded-lg border border-slate-200 p-3"
        >
          <div>
            <p class="text-sm font-medium text-slate-900">
              {{ member.email || member.user_id }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold capitalize"
              :class="
                member.role === 'editor'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
              "
            >
              {{ member.role }}
            </span>
            <button
              v-if="isOwner"
              type="button"
              class="rounded p-1 text-slate-400 hover:text-red-600"
              title="Remove member"
              @click="handleRemove(member.id)"
            >
              ✕
            </button>
          </div>
        </div>

        <p v-if="!members.length" class="mt-2 text-sm text-slate-500">No shared members yet.</p>
      </div>
    </div>
  </ModalDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useTripStore } from '@/stores/trips';
import { useAuthStore } from '@/stores/auth';
import type { TripMemberRole } from '@/types/entities';

const props = defineProps<{
  open: boolean;
  tripId: string;
}>();

defineEmits<{ (e: 'close'): void }>();

const tripStore = useTripStore();
const authStore = useAuthStore();

const inviteEmail = ref('');
const inviteRole = ref<TripMemberRole>('viewer');
const inviting = ref(false);
const inviteError = ref('');
const inviteSuccess = ref('');

const isOwner = computed(() => {
  return tripStore.currentTrip?.created_by === authStore.user?.id;
});

const ownerEmail = computed(() => {
  if (isOwner.value) return authStore.user?.email ?? 'You';
  return tripStore.currentTrip?.created_by ?? 'Trip owner';
});

const members = computed(() => tripStore.members);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      inviteEmail.value = '';
      inviteError.value = '';
      inviteSuccess.value = '';
      tripStore.loadMembers(props.tripId);
    }
  },
);

const handleInvite = async () => {
  if (!inviteEmail.value.trim()) return;
  inviting.value = true;
  inviteError.value = '';
  inviteSuccess.value = '';
  try {
    await tripStore.inviteMember(
      props.tripId,
      inviteEmail.value.trim(),
      inviteRole.value,
      authStore.user?.id,
    );
    inviteSuccess.value = `Invited ${inviteEmail.value} as ${inviteRole.value}.`;
    inviteEmail.value = '';
  } catch (err: unknown) {
    inviteError.value = err instanceof Error ? err.message : 'Unable to invite user.';
  } finally {
    inviting.value = false;
  }
};

const handleRemove = async (memberId: string) => {
  try {
    await tripStore.removeMember(memberId);
  } catch (err: unknown) {
    inviteError.value = err instanceof Error ? err.message : 'Unable to remove member.';
  }
};
</script>
