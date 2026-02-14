<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <span
      v-if="loading"
      class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    ></span>
    <slot v-else-if="$slots.icon" name="icon" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  type: 'button',
  disabled: false,
  loading: false,
  fullWidth: false,
});

defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const buttonClasses = computed(() => {
  const base = 'btn';
  const variant = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    tertiary: 'btn-tertiary',
    ghost: 'btn-ghost',
    danger: 'btn bg-danger-500 text-white hover:bg-danger-600 dark:bg-danger-400 dark:text-neutral-900 dark:hover:bg-danger-300 focus:ring-danger-500 dark:focus:ring-danger-400',
  }[props.variant];
  
  const width = props.fullWidth ? 'w-full' : '';
  
  return [base, variant, width].filter(Boolean).join(' ');
});
</script>
