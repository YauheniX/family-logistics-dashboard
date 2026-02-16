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
        <select
          id="problem-label"
          v-model="label"
          class="input"
          :disabled="submitting"
        >
          <option value="bug">Bug</option>
          <option value="enhancement">Enhancement</option>
          <option value="super buba issue">Super Buba Issue</option>
        </select>
      </div>

      <div class="space-y-1">
        <label class="label" for="problem-screenshot">Optional screenshot</label>
        <input
          id="problem-screenshot"
          ref="fileInputRef"
          class="input py-1.5"
          type="file"
          accept="image/*"
          :disabled="submitting"
          @change="handleFileChange"
        />
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          PNG/JPG/GIF, max {{ maxScreenshotMb }}MB.
        </p>
        <p v-if="errors.screenshot" class="text-sm text-danger-500 dark:text-danger-400">
          {{ errors.screenshot }}
        </p>
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
import { reportProblem, type IssueLabel, type ScreenshotPayload } from '@/services/issueReporter';

defineProps<{ open: boolean }>();

const emit = defineEmits<{
  close: [];
}>();

const toastStore = useToastStore();
const authStore = useAuthStore();

const title = ref('');
const description = ref('');
const label = ref<IssueLabel>('bug');
const screenshot = ref<ScreenshotPayload | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const submitting = ref(false);
const errors = ref<{ title?: string; description?: string; screenshot?: string }>({});

const maxScreenshotBytes = 2 * 1024 * 1024;
const maxScreenshotMb = 2;

const resetForm = () => {
  title.value = '';
  description.value = '';
  label.value = 'bug';
  screenshot.value = null;
  errors.value = {};
  // Clear file input
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

const handleClose = () => {
  resetForm();
  emit('close');
};

const handleFileChange = async (event: Event) => {
  errors.value.screenshot = undefined;
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  if (!file) {
    screenshot.value = null;
    return;
  }

  if (!file.type.startsWith('image/')) {
    errors.value.screenshot = 'Please choose an image file.';
    screenshot.value = null;
    input.value = ''; // Clear input to allow re-selection
    return;
  }

  if (file.size > maxScreenshotBytes) {
    errors.value.screenshot = `Screenshot is too large (max ${maxScreenshotMb}MB).`;
    screenshot.value = null;
    input.value = ''; // Clear input to allow re-selection
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const base64 = dataUrl.split(',')[1] ?? '';
    screenshot.value = {
      name: file.name,
      type: file.type,
      dataBase64: base64,
    };
  } catch {
    errors.value.screenshot = 'Failed to read the screenshot file. Please try again.';
    screenshot.value = null;
    input.value = ''; // Clear input to allow re-selection after a read error
  }
};

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
      screenshot: screenshot.value,
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read screenshot file.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}
</script>
