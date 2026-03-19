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
          <div class="flex justify-center gap-1 mb-3">
            <Hand class="w-9 h-9 text-neutral-700 dark:text-neutral-300" />
            <HandMetal class="w-9 h-9 text-neutral-700 dark:text-neutral-300" />
            <Scissors class="w-9 h-9 text-neutral-700 dark:text-neutral-300" />
          </div>
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
            Rock-Paper-Scissors
          </h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">Play the classic game</p>
        </RouterLink>

        <!-- Placeholder for future apps -->
        <div
          class="rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 p-8 text-center"
        >
          <Smartphone class="w-10 h-10 mx-auto mb-3 text-neutral-400 dark:text-neutral-500" />
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
import { Smartphone, Hand, HandMetal, Scissors } from 'lucide-vue-next';

// Apps view - integrations and connected applications
</script>
