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
        <Check v-if="step < currentStep" class="w-5 h-5 text-white animate-check-in" />
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
import { Check } from 'lucide-vue-next';

interface Props {
  currentStep: number;
  totalSteps: number;
}

defineProps<Props>();
</script>
