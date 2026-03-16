<template>
  <button
    type="button"
    class="btn-ghost p-2 relative overflow-hidden group"
    aria-label="Toggle theme"
    @click="toggleTheme"
  >
    <Transition name="theme-icon" mode="out-in">
      <Sun
        v-if="currentTheme === 'dark'"
        key="sun"
        class="h-5 w-5 transition-transform group-hover:rotate-90 duration-slow"
        aria-hidden="true"
      />
      <Moon
        v-else
        key="moon"
        class="h-5 w-5 transition-transform group-hover:-rotate-12 duration-slow"
        aria-hidden="true"
      />
    </Transition>
  </button>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme';
import { Sun, Moon } from 'lucide-vue-next';

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
