<template>
  <div
    class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-md px-4"
    role="alert"
    aria-live="polite"
  >
    <transition-group name="toast">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        :class="toastClasses(toast.type)"
        class="flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg w-full"
      >
        <span class="text-lg">{{ toastIcon(toast.type) }}</span>
        <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
        <button
          type="button"
          class="text-lg opacity-70 hover:opacity-100"
          @click="toastStore.remove(toast.id)"
        >
          ×
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '@/stores/toast';
import type { ToastType } from '@/types/api';

const toastStore = useToastStore();

const toastClasses = (type: ToastType) => {
  const classes = {
    success:
      'bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-100 dark:border-emerald-700',
    error:
      'bg-red-50 text-red-900 border border-red-200 dark:bg-red-900/30 dark:text-red-100 dark:border-red-700',
    warning:
      'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-700',
    info: 'bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-700',
  };
  return classes[type] || classes.info;
};

const toastIcon = (type: ToastType) => {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };
  return icons[type] || icons.info;
};
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.toast-move {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
