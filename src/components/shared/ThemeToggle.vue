<template>
  <button
    type="button"
    class="btn-ghost p-2 relative overflow-hidden group"
    aria-label="Toggle theme"
    @click="toggleTheme"
  >
    <Transition name="theme-icon" mode="out-in">
      <svg
        v-if="currentTheme === 'dark'"
        key="sun"
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 transition-transform group-hover:rotate-90 duration-slow"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
      <svg
        v-else
        key="moon"
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 transition-transform group-hover:-rotate-12 duration-slow"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </Transition>
  </button>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme';

const { currentTheme, toggleTheme } = useTheme();
</script>

<style scoped>
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition: all 0.3s ease;
}

.theme-icon-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}

.theme-icon-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}
</style>
