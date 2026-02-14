<template>
  <span :class="badgeClasses" :aria-label="ariaLabel">
    <slot name="icon" />
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'primary';
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'neutral',
  ariaLabel: undefined,
});

const badgeClasses = computed(() => {
  const base = 'badge';
  const variant = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    neutral: 'badge-neutral',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-400',
  }[props.variant];

  return [base, variant].filter(Boolean).join(' ');
});
</script>
