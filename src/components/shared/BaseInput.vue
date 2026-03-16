<template>
  <div class="space-y-1">
    <label v-if="!floatingLabel && label" :for="inputId" class="label block mb-1">
      {{ label }}
      <span v-if="required" class="text-danger-500 dark:text-danger-400">*</span>
    </label>
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
        <Check class="w-5 h-5" />
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
        <component
          :is="showPassword ? EyeOff : Eye"
          class="w-5 h-5 transition-transform duration-200"
          :class="{ 'rotate-180': showPassword }"
        />
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
      <CircleX class="w-4 h-4" aria-hidden="true" />
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
import { Check, Eye, EyeOff, CircleX } from 'lucide-vue-next';

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
