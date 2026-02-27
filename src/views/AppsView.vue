<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-dark-bg pb-20 lg:pb-0">
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <!-- Apps Grid -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <!-- Rock-Paper-Scissors Game -->
        <RouterLink
          to="/apps/rock-paper-scissors"
          class="rounded-lg border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-8 text-center transition-all hover:shadow-lg hover:border-primary-500 dark:hover:border-primary-500 cursor-pointer"
        >
          <div class="text-4xl mb-3">✊✋✌️</div>
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
            Rock-Paper-Scissors
          </h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">Play the classic game</p>
        </RouterLink>

        <!-- Cityscape -->
        <RouterLink
          to="/apps/cityscape"
          class="rounded-lg border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-8 text-center transition-all hover:shadow-lg hover:border-primary-500 dark:hover:border-primary-500 cursor-pointer"
        >
          <div class="text-4xl mb-3">🏙️</div>
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
            Cityscape
          </h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            Interactive animated city scene
          </p>
        </RouterLink>

        <!-- Placeholder for future apps -->
        <div
          class="rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 p-8 text-center"
        >
          <div class="text-4xl mb-3">📱</div>
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
            Coming Soon
          </h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">More apps coming soon</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';

// Apps view - integrations and connected applications
</script>
