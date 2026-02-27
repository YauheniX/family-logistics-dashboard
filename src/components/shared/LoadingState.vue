<template>
  <div class="glass-card flex items-center gap-3 p-4 text-sm text-slate-600 dark:text-slate-400">
    <span class="h-2 w-2 animate-ping rounded-full bg-brand-500"></span>
    <span>{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message?: string;
  }>(),
  {
    message: 'Loading...',
  },
);
</script>
