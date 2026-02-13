<template>
  <div class="space-y-6">
    <div class="glass-card flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <p class="text-sm text-slate-500">Packing Templates</p>
        <h2 class="text-2xl font-semibold text-slate-900">Reusable packing lists</h2>
        <p class="mt-1 text-sm text-slate-600">
          Create templates and apply them to any trip.
        </p>
      </div>
      <RouterLink to="/" class="btn-ghost">← Back to Dashboard</RouterLink>
    </div>

    <!-- Create template form -->
    <div class="glass-card p-5">
      <h3 class="text-lg font-semibold text-slate-900">Create Template</h3>
      <form class="mt-4 space-y-3" @submit.prevent="handleCreate">
        <div class="grid gap-3 md:grid-cols-2">
          <input v-model="templateName" class="input" placeholder="Template name" />
          <select v-model="templateCategory" class="input">
            <option value="adult">Adult</option>
            <option value="kid">Kid</option>
            <option value="baby">Baby</option>
            <option value="roadtrip">Roadtrip</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div class="space-y-2">
          <div v-for="(item, index) in templateItems" :key="index" class="flex gap-2">
            <input
              v-model="templateItems[index]"
              class="input flex-1"
              :placeholder="`Item ${index + 1}`"
            />
            <button
              type="button"
              class="rounded-md px-2 text-slate-400 hover:text-red-500"
              @click="removeItem(index)"
            >
              ✕
            </button>
          </div>
          <button type="button" class="btn-ghost text-sm" @click="addItem">+ Add item</button>
        </div>

        <button
          class="btn-primary"
          type="submit"
          :disabled="!templateName.trim() || !templateItems.filter(Boolean).length || templateStore.loading"
        >
          Create Template
        </button>
      </form>
    </div>

    <!-- Template list -->
    <LoadingState v-if="templateStore.loading" message="Loading templates..." />

    <div v-else-if="templateStore.templates.length" class="space-y-3">
      <div
        v-for="template in templateStore.templates"
        :key="template.id"
        class="glass-card flex items-center justify-between p-4"
      >
        <div>
          <p class="font-medium text-slate-900">{{ template.name }}</p>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {{ template.category }}
          </span>
        </div>
        <button
          type="button"
          class="btn-ghost text-sm text-red-600 hover:text-red-800"
          @click="handleDelete(template.id)"
        >
          Delete
        </button>
      </div>
    </div>

    <EmptyState
      v-else
      title="No templates yet"
      description="Create your first packing template to reuse across trips."
      badge="Templates"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import LoadingState from '@/components/shared/LoadingState.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import { useAuthStore } from '@/stores/auth';
import { useTemplateStore } from '@/stores/templates';
import type { PackingCategory } from '@/types/entities';

const authStore = useAuthStore();
const templateStore = useTemplateStore();

const templateName = ref('');
const templateCategory = ref<PackingCategory>('custom');
const templateItems = ref<string[]>(['']);

const addItem = () => {
  templateItems.value.push('');
};

const removeItem = (index: number) => {
  templateItems.value.splice(index, 1);
  if (!templateItems.value.length) templateItems.value.push('');
};

const handleCreate = async () => {
  if (!authStore.user?.id || !templateName.value.trim()) return;

  const items = templateItems.value.filter((item) => item.trim());
  if (!items.length) return;

  await templateStore.createTemplate(
    {
      name: templateName.value.trim(),
      category: templateCategory.value,
      created_by: authStore.user.id,
    },
    items,
  );

  templateName.value = '';
  templateCategory.value = 'custom';
  templateItems.value = [''];
};

const handleDelete = async (id: string) => {
  await templateStore.removeTemplate(id);
};

onMounted(() => {
  if (authStore.user?.id) {
    templateStore.loadTemplates(authStore.user.id);
  }
});
</script>
