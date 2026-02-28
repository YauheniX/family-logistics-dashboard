<template>
  <div
    class="glass-card flex items-center gap-3 p-4 text-sm text-neutral-600 dark:text-neutral-400 animate-fade-in"
  >
    <div class="relative">
      <span class="absolute h-3 w-3 animate-ping rounded-full bg-primary-500 opacity-75"></span>
      <span class="relative block h-3 w-3 rounded-full bg-primary-500"></span>
    </div>
    <span class="animate-pulse">{{ message }}</span>
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
