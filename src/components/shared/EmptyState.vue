<template>
  <div
    class="glass-card flex flex-col items-center gap-4 p-8 text-center animate-slide-up"
    role="status"
  >
    <!-- Animated Icon -->
    <div
      class="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 flex items-center justify-center animate-breathing"
    >
      <div
        class="absolute inset-0 rounded-full bg-primary-500/10 dark:bg-primary-400/10 animate-pulse"
      />
      <span class="text-4xl relative z-10" :aria-hidden="!iconLabel" :aria-label="iconLabel">
        {{ icon || '📦' }}
      </span>
    </div>

    <!-- Badge -->
    <div
      v-if="badge"
      class="rounded-full bg-neutral-100 dark:bg-neutral-700 px-4 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 shadow-soft animate-fade-in"
      style="animation-delay: 100ms"
    >
      {{ badge }}
    </div>

    <!-- Title & Description -->
    <div class="space-y-2 animate-fade-in" style="animation-delay: 200ms">
      <h3 class="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{{ title }}</h3>
      <p class="text-sm text-neutral-600 dark:text-neutral-400 max-w-md">{{ description }}</p>
    </div>

    <!-- CTA Button with Hover Effect -->
    <button
      v-if="cta"
      class="btn-primary mt-2 group relative overflow-hidden animate-fade-in"
      style="animation-delay: 300ms"
      type="button"
      @click="$emit('action')"
      @mouseenter="isHovering = true"
      @mouseleave="isHovering = false"
    >
      <span class="relative z-10 flex items-center gap-2">
        {{ cta }}
        <svg
          class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </span>
      <!-- Ripple effect background -->
      <span
        v-if="isHovering"
        class="absolute inset-0 bg-white/20 dark:bg-black/20 rounded-lg animate-ripple"
      />
    </button>

    <!-- Optional Secondary Action -->
    <button
      v-if="secondaryAction"
      class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline transition-colors duration-200 animate-fade-in"
      style="animation-delay: 400ms"
      type="button"
      @click="$emit('secondary-action')"
    >
      {{ secondaryAction }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

withDefaults(
  defineProps<{
    title: string;
    description: string;
    cta?: string;
    badge?: string;
    icon?: string;
    iconLabel?: string;
    secondaryAction?: string;
  }>(),
  {
    badge: '',
    cta: '',
    icon: '📦',
    iconLabel: '',
    secondaryAction: '',
  },
);

defineEmits<{
  (e: 'action'): void;
  (e: 'secondary-action'): void;
}>();

const isHovering = ref(false);
</script>
