<template>
  <ModalDialog :open="open" title="Report a problem" @close="handleClose">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <BaseInput
        v-model="title"
        label="Title"
        placeholder="Short summary"
        :required="true"
        :disabled="submitting"
        :error="errors.title"
      />

      <div class="space-y-1">
        <label class="label" for="problem-description">
          Description <span class="text-danger-500 dark:text-danger-400">*</span>
        </label>
        <textarea
          id="problem-description"
          v-model="description"
          class="input min-h-28"
          :disabled="submitting"
          required
          placeholder="What happened? What did you expect? Steps to reproduce?"
        />
        <p v-if="errors.description" class="text-sm text-danger-500 dark:text-danger-400">
          {{ errors.description }}
        </p>
      </div>

      <div class="space-y-1">
        <label class="label" for="problem-label">Type</label>
        <select id="problem-label" v-model="label" class="input" :disabled="submitting">
          <option value="bug">Bug</option>
          <option value="enhancement">Enhancement</option>
          <option value="super buba issue">Super Buba Issue</option>
        </select>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="ghost" type="button" :disabled="submitting" @click="handleClose">
          Cancel
        </BaseButton>
        <BaseButton variant="primary" type="submit" :loading="submitting">
          Create GitHub issue
        </BaseButton>
      </div>
    </form>
  </ModalDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import { reportProblem, type IssueLabel } from '@/services/issueReporter';

defineProps<{ open: boolean }>();

const emit = defineEmits<{
  close: [];
}>();

const toastStore = useToastStore();
const authStore = useAuthStore();

const title = ref('');
const description = ref('');
const label = ref<IssueLabel>('bug');

const submitting = ref(false);
const errors = ref<{ title?: string; description?: string }>({});

const resetForm = () => {
  title.value = '';
  description.value = '';
  label.value = 'bug';
  errors.value = {};
  // Clear file input
  // file input removed
};

const handleClose = () => {
  resetForm();
  emit('close');
};

// Screenshot input removed to avoid large payloads causing GitHub failures

const validate = () => {
  errors.value = {};
  if (!title.value.trim()) {
    errors.value.title = 'Title is required.';
  }
  if (!description.value.trim()) {
    errors.value.description = 'Description is required.';
  }
  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  if (submitting.value) return;
  if (!validate()) return;

  submitting.value = true;
  try {
    await reportProblem({
      title: title.value.trim(),
      description: description.value.trim(),
      userId: authStore.user?.id ?? null,
      label: label.value,
    });

    toastStore.success('Issue created. Thanks for the report!');
    handleClose();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to create issue.';
    toastStore.error(message);
  } finally {
    submitting.value = false;
  }
};

</script>
