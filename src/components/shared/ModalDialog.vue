<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          class="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          @click="$emit('close')"
        />
        <div
          class="relative z-10 w-full max-w-lg rounded-card bg-white dark:bg-neutral-800 p-6 shadow-xl border border-neutral-200 dark:border-neutral-700"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-h2 text-neutral-900 dark:text-neutral-50">{{ title }}</h3>
            <button
              type="button"
              class="rounded-md p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              aria-label="Close modal"
              @click="$emit('close')"
            >
              ✕
            </button>
          </div>
          <div class="mt-4">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean;
  title: string;
}>();

defineEmits<{ (e: 'close'): void }>();
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
