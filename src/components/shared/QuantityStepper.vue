<template>
  <div class="flex items-center gap-2">
    <!-- Quantity Stepper -->
    <button
      type="button"
      :disabled="modelValue <= min"
      :aria-disabled="modelValue <= min"
      class="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-neutral-300 dark:border-neutral-600 text-lg font-semibold transition-all duration-200 hover:border-primary-500 dark:hover:border-primary-400 focus-ring group"
      :class="
        modelValue <= min
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:scale-105 active:scale-95'
      "
      :aria-label="`Decrease ${label}`"
      @click="decrement"
    >
      <span
        class="transition-transform group-hover:scale-110 group-active:scale-90"
        aria-hidden="true"
      >
        −
      </span>
    </button>

    <!-- Value Display with Animation -->
    <div
      class="relative w-16 h-9 flex items-center justify-center"
      role="status"
      :aria-label="`${label}: ${modelValue}`"
    >
      <span
        :key="modelValue"
        class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 animate-number-roll"
      >
        {{ modelValue }}
      </span>
    </div>

    <!-- Increment Button -->
    <button
      type="button"
      :disabled="modelValue >= max"
      :aria-disabled="modelValue >= max"
      class="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-neutral-300 dark:border-neutral-600 text-lg font-semibold transition-all duration-200 hover:border-primary-500 dark:hover:border-primary-400 focus-ring group"
      :class="
        modelValue >= max
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:scale-105 active:scale-95'
      "
      :aria-label="`Increase ${label}`"
      @click="increment"
    >
      <span
        class="transition-transform group-hover:scale-110 group-active:scale-90"
        aria-hidden="true"
      >
        +
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: number;
  min?: number;
  max?: number;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  min: 1,
  max: 999,
  label: 'quantity',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const increment = () => {
  if (props.modelValue < props.max) {
    emit('update:modelValue', props.modelValue + 1);
  }
};

const decrement = () => {
  if (props.modelValue > props.min) {
    emit('update:modelValue', props.modelValue - 1);
  }
};
</script>
