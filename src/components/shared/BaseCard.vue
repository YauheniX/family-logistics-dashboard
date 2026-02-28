<template>
  <div :class="cardClasses">
    <div v-if="$slots.header" class="border-b border-neutral-200 dark:border-neutral-700 p-4">
      <slot name="header" />
    </div>
    <div :class="contentClasses" class="flex-1">
      <slot />
    </div>
    <div
      v-if="$slots.footer"
      class="border-t border-neutral-200 dark:border-neutral-700 p-4 mt-auto"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  padding?: boolean;
  hover?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  padding: true,
  hover: false,
});

const cardClasses = computed(() => {
  const base = 'glass-card flex flex-col h-full';
  const hoverEffect = props.hover
    ? 'transition-all duration-normal hover:shadow-card-hover cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
    : '';
  return [base, hoverEffect].filter(Boolean).join(' ');
});

const contentClasses = computed(() => {
  return props.padding ? 'p-4' : '';
});
</script>
