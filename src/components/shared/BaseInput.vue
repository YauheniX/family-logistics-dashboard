<template>
  <div class="space-y-1">
    <!-- Floating Label -->
    <div class="relative">
      <!-- Icon Left with Focus Animation -->
      <span
        v-if="$slots.iconLeft"
        class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 transition-all duration-300 ease-in-out"
        :class="{ 'scale-110 text-primary-500 dark:text-primary-400': isFocused }"
      >
        <slot name="iconLeft" />
      </span>

      <!-- Floating Label (when floatingLabel prop is true) -->
      <label
        v-if="floatingLabel && label"
        :for="inputId"
        class="absolute left-3 transition-all duration-200 ease-in-out pointer-events-none"
        :class="[
          { 'left-10': $slots.iconLeft },
          isFloating
            ? '-top-2 text-xs bg-white dark:bg-neutral-800 px-1 text-primary-500 dark:text-primary-400'
            : 'top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400',
        ]"
      >
        {{ label }}
        <span v-if="required" class="text-danger-500 dark:text-danger-400">*</span>
      </label>

      <!-- Standard Label (when floatingLabel is false) -->
      <label v-else-if="label" :for="inputId" class="label block mb-1">
        {{ label }}
        <span v-if="required" class="text-danger-500 dark:text-danger-400">*</span>
      </label>

      <!-- Input/Textarea -->
      <textarea
        v-if="type === 'textarea'"
        :id="inputId"
        :value="modelValue"
        :placeholder="floatingLabel ? '' : placeholder"
        :disabled="disabled"
        :required="required"
        :maxlength="maxLength"
        :rows="rows"
        :aria-label="ariaLabel || label"
        :aria-invalid="!!error"
        :aria-describedby="getAriaDescribedBy"
        :class="getInputClasses"
        @input="handleInput"
        @focus="isFocused = true"
        @blur="handleBlur"
      />
      <input
        v-else
        :id="inputId"
        :type="computedType"
        :value="modelValue"
        :placeholder="floatingLabel ? '' : placeholder"
        :disabled="disabled"
        :required="required"
        :maxlength="maxLength"
        :aria-label="ariaLabel || label"
        :aria-invalid="!!error"
        :aria-describedby="getAriaDescribedBy"
        :class="getInputClasses"
        @input="handleInput"
        @focus="isFocused = true"
        @blur="handleBlur"
      />

      <!-- Success Checkmark -->
      <span
        v-if="showSuccess && !error"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-success-500 dark:text-success-400 animate-check-in"
        aria-hidden="true"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </span>

      <!-- Password Toggle -->
      <button
        v-else-if="type === 'password' && modelValue"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        :class="{ 'right-10': $slots.iconRight }"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
        @click="togglePasswordVisibility"
      >
        <svg
          class="w-5 h-5 transition-transform duration-200"
          :class="{ 'rotate-180': showPassword }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            v-if="!showPassword"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            v-if="!showPassword"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
      </button>

      <!-- Icon Right -->
      <span
        v-else-if="$slots.iconRight && type !== 'password'"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 transition-all duration-300"
        :class="{ 'scale-110 text-primary-500 dark:text-primary-400': isFocused }"
      >
        <slot name="iconRight" />
      </span>
    </div>

    <!-- Character Counter (for textarea) -->
    <div
      v-if="type === 'textarea' && maxLength && showCharCount"
      :id="`${inputId}-char-count`"
      class="flex justify-end"
    >
      <span
        class="text-xs transition-colors duration-200"
        :class="
          currentLength > maxLength
            ? 'text-danger-500 dark:text-danger-400 font-semibold'
            : currentLength > maxLength * 0.9
              ? 'text-warning-600 dark:text-warning-400'
              : 'text-neutral-500 dark:text-neutral-400'
        "
      >
        {{ currentLength }} / {{ maxLength }}
      </span>
    </div>

    <!-- Error Message with Slide-in Animation -->
    <p
      v-if="error"
      :id="`${inputId}-error`"
      class="text-sm text-danger-500 dark:text-danger-400 flex items-center gap-1 animate-slide-down"
    >
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clip-rule="evenodd"
        />
      </svg>
      {{ error }}
    </p>
    <!-- Hint Message -->
    <p v-else-if="hint" class="text-sm text-neutral-500 dark:text-neutral-400">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useSlots } from 'vue';

const slots = useSlots();

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
  floatingLabel?: boolean;
  showSuccess?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
  rows?: number;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false,
  floatingLabel: false,
  showSuccess: false,
  showCharCount: true,
  rows: 4,
  label: undefined,
  placeholder: undefined,
  error: undefined,
  hint: undefined,
  ariaLabel: undefined,
  maxLength: undefined,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur'): void;
}>();

const isFocused = ref(false);
const showPassword = ref(false);

let inputCounter = 0;
const inputId = computed(() => `input-${++inputCounter}`);

const isFloating = computed(() => {
  return props.floatingLabel && (isFocused.value || !!props.modelValue);
});

const computedType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password';
  }
  return props.type;
});

const currentLength = computed(() => String(props.modelValue || '').length);

const getInputClasses = computed(() => [
  props.type === 'textarea' ? 'input resize-none' : 'input',
  { 'pl-10': slots.iconLeft },
  {
    'pr-10': slots.iconRight || (props.showSuccess && !props.error) || props.type === 'password',
  },
  { error: props.error },
  {
    'border-success-500 focus:border-success-500 focus:ring-success-500/20':
      props.showSuccess && !props.error,
  },
]);

const getAriaDescribedBy = computed(() => {
  const ids: string[] = [];
  if (props.error) ids.push(`${inputId.value}-error`);
  if (props.type === 'textarea' && props.maxLength && props.showCharCount)
    ids.push(`${inputId.value}-char-count`);
  return ids.length > 0 ? ids.join(' ') : undefined;
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  emit('update:modelValue', target.value);
};

const handleBlur = () => {
  isFocused.value = false;
  emit('blur');
};

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};
</script>
