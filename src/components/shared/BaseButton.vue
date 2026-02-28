<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    :aria-label="ariaLabel"
    class="group relative overflow-hidden"
    @click="handleClick"
  >
    <!-- Ripple Effect -->
    <span
      v-if="showRipple"
      class="absolute inset-0 bg-white/20 dark:bg-black/20 rounded-lg scale-0 group-active:scale-100 transition-transform duration-300 pointer-events-none"
    />

    <!-- Content Wrapper -->
    <span
      class="relative z-10 flex items-center justify-center gap-2"
      :class="{ 'opacity-0': loading }"
    >
      <slot v-if="$slots.icon" name="icon" />
      <slot />
    </span>

    <!-- Loading Spinner (Centered Overlay) -->
    <span
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <span
        class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  ariaLabel?: string;
  ripple?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  type: 'button',
  disabled: false,
  loading: false,
  fullWidth: false,
  ripple: true,
  ariaLabel: undefined,
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const showRipple = ref(false);

const buttonClasses = computed(() => {
  const base = 'btn';
  const variant = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    tertiary: 'btn-tertiary',
    ghost: 'btn-ghost',
    danger:
      'btn bg-danger-500 text-white hover:bg-danger-600 dark:bg-danger-400 dark:text-neutral-900 dark:hover:bg-danger-300 focus:ring-danger-500 dark:focus:ring-danger-400',
  }[props.variant];

  const width = props.fullWidth ? 'w-full' : '';

  return [base, variant, width].filter(Boolean).join(' ');
});

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    if (props.ripple) {
      showRipple.value = true;
      setTimeout(() => {
        showRipple.value = false;
      }, 300);
    }
    emit('click', event);
  }
};
</script>
