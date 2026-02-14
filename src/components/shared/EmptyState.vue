<template>
  <div class="glass-card flex flex-col items-start gap-3 p-6 text-left">
    <div class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      {{ badge }}
    </div>
    <div>
      <h3 class="text-lg font-semibold text-slate-900">{{ title }}</h3>
      <p class="mt-1 text-sm text-slate-600">{{ description }}</p>
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
    badge: 'Getting started',
    cta: '',
  },
);

defineEmits<{ (e: 'action'): void }>();
</script>
