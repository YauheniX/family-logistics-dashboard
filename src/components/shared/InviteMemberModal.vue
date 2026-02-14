<template>
  <ModalDialog :open="open" title="Invite Family Member" @close="handleClose">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <p class="text-body text-neutral-700 dark:text-neutral-300">
        Enter their email address to send an invitation.
      </p>

      <BaseInput
        v-model="email"
        type="email"
        label="Email Address"
        placeholder="member@example.com"
        :error="emailError"
        :required="true"
        aria-label="Member email address"
      />

      <div class="flex items-center gap-3 pt-2">
        <BaseButton
          variant="secondary"
          type="button"
          :full-width="true"
          @click="handleClose"
        >
          Cancel
        </BaseButton>
        <BaseButton
          variant="primary"
          type="submit"
          :loading="loading"
          :disabled="loading || !email"
          :full-width="true"
        >
          Send Invite
        </BaseButton>
      </div>

      <p v-if="error" class="text-sm text-danger-500 dark:text-danger-400">
        {{ error }}
      </p>
    </form>
  </ModalDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import ModalDialog from './ModalDialog.vue';
import BaseInput from './BaseInput.vue';
import BaseButton from './BaseButton.vue';
import { isValidEmail } from '@/utils/validation';

interface Props {
  open: boolean;
  familyId?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'invite', email: string): void;
}>();

const email = ref('');
const emailError = ref('');
const error = ref('');
const loading = ref(false);

// Reset form when modal is opened
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    email.value = '';
    emailError.value = '';
    error.value = '';
    loading.value = false;
  }
});

const validateEmail = (): boolean => {
  emailError.value = '';
  
  if (!email.value) {
    emailError.value = 'Email is required';
    return false;
  }
  
  if (!isValidEmail(email.value)) {
    emailError.value = 'Please enter a valid email address';
    return false;
  }
  
  return true;
};

const handleClose = () => {
  if (!loading.value) {
    emit('close');
  }
};

const handleSubmit = async () => {
  if (!validateEmail()) {
    return;
  }

  error.value = '';
  loading.value = true;

  try {
    emit('invite', email.value);
    // Note: The parent component should handle the actual invitation logic
    // and close the modal on success
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to send invitation';
  } finally {
    loading.value = false;
  }
};
</script>
