<template>
  <div class="glass-card flex flex-col items-start gap-3 p-6 text-left">
    <div
      v-if="badge"
      class="rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300"
    >
      {{ badge }}
    </div>
    <div>
      <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ title }}</h3>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{{ description }}</p>
    </div>
    <button v-if="cta" class="btn-primary" type="button" @click="$emit('action')">
      {{ cta }}
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description: string;
    cta?: string;
    badge?: string;
  }>(),
  {
    badge: '',
    cta: '',
  },
);

defineEmits<{ (e: 'action'): void }>();
</script>
