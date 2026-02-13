<template>
  <ModalDialog :open="open" title="Apply Packing Template" @close="$emit('close')">
    <div v-if="templateStore.loading" class="flex items-center gap-2 text-sm text-slate-600">
      <span class="h-2 w-2 animate-ping rounded-full bg-brand-500"></span>
      Loading templates...
    </div>

    <div v-else-if="!templateStore.templates.length" class="text-sm text-slate-500">
      <p>No templates yet.</p>
      <RouterLink to="/templates" class="mt-2 inline-block text-brand-600 hover:underline" @click="$emit('close')">
        Create your first template →
      </RouterLink>
    </div>

    <div v-else class="space-y-3">
      <button
        v-for="template in templateStore.templates"
        :key="template.id"
        type="button"
        class="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50"
        :disabled="templateStore.applying"
        @click="handleApply(template.id)"
      >
        <div>
          <p class="font-medium text-slate-900">{{ template.name }}</p>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {{ template.category }}
          </span>
        </div>
        <span class="text-sm text-brand-600">Apply</span>
      </button>

      <div v-if="templateStore.applying" class="flex items-center gap-2 text-sm text-slate-600">
        <span class="h-2 w-2 animate-ping rounded-full bg-brand-500"></span>
        Applying template...
      </div>

      <div v-if="result" class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
        ✓ Added {{ result.added }} item(s)<span v-if="result.skipped">, skipped {{ result.skipped }} duplicate(s)</span>.
      </div>
    </div>
  </ModalDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useTemplateStore } from '@/stores/templates';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  open: boolean;
  tripId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'applied'): void;
}>();

const templateStore = useTemplateStore();
const authStore = useAuthStore();
const result = ref<{ added: number; skipped: number } | null>(null);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      result.value = null;
      if (authStore.user?.id) {
        templateStore.loadTemplates(authStore.user.id);
      }
    }
  },
);

const handleApply = async (templateId: string) => {
  result.value = null;
  try {
    result.value = await templateStore.applyTemplate(templateId, props.tripId);
    emit('applied');
  } catch {
    // error handled in store
  }
};
</script>
