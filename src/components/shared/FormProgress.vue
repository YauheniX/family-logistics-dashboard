<template>
  <div
    class="flex items-center justify-between mb-6"
    role="progressbar"
    :aria-valuenow="currentStep"
    :aria-valuemin="1"
    :aria-valuemax="totalSteps"
  >
    <div
      v-for="step in totalSteps"
      :key="step"
      class="progress-step"
      :class="{
        active: step === currentStep,
        completed: step < currentStep,
      }"
    >
      <div class="progress-step-circle">
        <!-- Completed Step -->
        <svg
          v-if="step < currentStep"
          class="w-5 h-5 text-white animate-check-in"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
        <!-- Active/Future Step -->
        <span v-else class="text-sm font-semibold">{{ step }}</span>
      </div>
      <p
        class="mt-2 text-xs font-medium"
        :class="
          step <= currentStep
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-neutral-400 dark:text-neutral-600'
        "
      >
        <slot :name="`step-${step}-label`">Step {{ step }}</slot>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  currentStep: number;
  totalSteps: number;
}

defineProps<Props>();
</script>
