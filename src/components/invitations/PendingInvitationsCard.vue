<template>
  <BaseCard v-if="invitations.length > 0" :padding="false">
    <div class="p-5">
      <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        📨 Pending Invitations
      </h3>
      <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        You have {{ invitations.length }} invitation{{ invitations.length === 1 ? '' : 's' }} to
        join household{{ invitations.length === 1 ? '' : 's' }}
      </p>

      <div class="mt-4 space-y-3">
        <div
          v-for="invitation in invitations"
          :key="invitation.id"
          class="rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 p-4"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h4 class="font-semibold text-neutral-900 dark:text-neutral-100">
                {{ invitation.household_name }}
              </h4>
              <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                <span class="font-medium">{{ invitation.invited_by_name }}</span> invited you to
                join as
                <span class="font-medium capitalize">{{ invitation.role }}</span>
              </p>
              <p class="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
                Expires {{ formatExpiryDate(invitation.expires_at) }}
              </p>
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            <BaseButton
              variant="primary"
              size="sm"
              :loading="processingId === invitation.id"
              :disabled="loading"
              @click="handleAccept(invitation.id)"
            >
              Accept
            </BaseButton>
            <BaseButton
              variant="ghost"
              size="sm"
              :disabled="loading || processingId === invitation.id"
              @click="handleDecline(invitation.id)"
            >
              Decline
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import { useInvitations } from '@/composables/useInvitations';

const { invitations, loading, fetchPendingInvitations, acceptInvitation, declineInvitation } =
  useInvitations();

const processingId = ref<string | null>(null);

const emit = defineEmits<{
  invitationAccepted: [];
}>();

onMounted(() => {
  fetchPendingInvitations();
});

async function handleAccept(invitationId: string) {
  processingId.value = invitationId;
  const success = await acceptInvitation(invitationId);
  processingId.value = null;

  if (success) {
    // Emit event so parent can refresh household list
    emit('invitationAccepted');
  }
}

async function handleDecline(invitationId: string) {
  processingId.value = invitationId;
  await declineInvitation(invitationId);
  processingId.value = null;
}

function formatExpiryDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 1) {
    return `in ${diffDays} days`;
  } else if (diffDays === 1) {
    return 'in 1 day';
  } else if (diffHours > 1) {
    return `in ${diffHours} hours`;
  } else if (diffHours === 1) {
    return 'in 1 hour';
  } else {
    return 'soon';
  }
}
</script>
