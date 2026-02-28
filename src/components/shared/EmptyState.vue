<template>
  <div class="glass-card flex flex-col items-start gap-3 p-6 text-left animate-fade-in">
    <div
      v-if="badge"
      class="rounded-full bg-neutral-100 dark:bg-neutral-700 px-3 py-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300 shadow-soft"
    >
      {{ badge }}
    </div>
    <div>
      <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{{ title }}</h3>
      <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{{ description }}</p>
    </div>
    <button
      v-if="cta"
      class="btn-primary hover:shadow-medium"
      type="button"
      @click="$emit('action')"
    >
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
