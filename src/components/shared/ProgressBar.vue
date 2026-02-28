<template>
  <div
    v-if="isLoading"
    class="w-full h-1 bg-neutral-200 dark:bg-neutral-700 overflow-hidden"
    role="progressbar"
    aria-label="Page loading"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="progress"
  >
    <div
      class="h-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 transition-all duration-300 ease-out shadow-glow"
      :style="{ width: `${progress}%` }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isLoading = ref(false);
const progress = ref(0);
let progressInterval: ReturnType<typeof setInterval> | null = null;

// Start progress on route change
router.beforeEach((_to, _from, next) => {
  isLoading.value = true;
  progress.value = 0;

  // Simulate progress
  progressInterval = setInterval(() => {
    if (progress.value < 90) {
      progress.value += Math.random() * 30;
      if (progress.value > 90) progress.value = 90;
    }
  }, 200);

  next();
});

// Complete progress after route change
router.afterEach(() => {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }

  // Complete to 100% then hide
  progress.value = 100;
  setTimeout(() => {
    isLoading.value = false;
    progress.value = 0;
  }, 300);
});

// Cleanup on unmount
watch(
  () => isLoading.value,
  (newVal) => {
    if (!newVal && progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  },
);
</script>
