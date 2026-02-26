<template>
  <div class="space-y-1">
    <label v-if="label" :for="inputId" class="label">
      {{ label }}
      <span v-if="required" class="text-danger-500 dark:text-danger-400">*</span>
    </label>
    <div class="relative">
      <span
        v-if="$slots.iconLeft"
        class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
      >
        <slot name="iconLeft" />
      </span>
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-label="ariaLabel || label"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${inputId}-error` : undefined"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
      />
      <span
        v-if="$slots.iconRight"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
      >
        <slot name="iconRight" />
      </span>
    </div>
    <p v-if="error" :id="`${inputId}-error`" class="text-sm text-danger-500 dark:text-danger-400">
      {{ error }}
    </p>
    <p v-else-if="hint" class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';

interface Props {
  modelValue: string | number;
  label?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false,
  label: undefined,
  placeholder: undefined,
  error: undefined,
  hint: undefined,
  ariaLabel: undefined,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur'): void;
}>();

// Use a counter to generate unique IDs
let inputCounter = 0;
const inputId = computed(() => {
  return `input-${++inputCounter}`;
});

const slots = useSlots();

const inputClasses = computed(() => {
  const base = 'input';
  const hasIconLeft = slots.iconLeft ? 'pl-10' : '';
  const hasIconRight = slots.iconRight ? 'pr-10' : '';
  const errorClass = props.error ? 'error' : '';

  return [base, hasIconLeft, hasIconRight, errorClass].filter(Boolean).join(' ');
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};

const handleBlur = () => {
  emit('blur');
};
</script>
