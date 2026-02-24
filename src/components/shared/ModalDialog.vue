<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div
          class="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          @click="$emit('close')"
        />
        <div
          class="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-card bg-white dark:bg-neutral-800 shadow-xl border border-neutral-200 dark:border-neutral-700 my-auto"
        >
          <div class="flex items-center justify-between p-6 flex-shrink-0">
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
          <div class="modal-content px-6 pb-6 pt-0 overflow-y-auto flex-1">
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
.modal-content {
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: rgb(212 212 212) transparent; /* neutral-300 */
}

.dark .modal-content {
  scrollbar-color: rgb(82 82 82) transparent; /* neutral-600 */
}

/* Webkit browsers (Chrome, Safari, Edge) scrollbar styling */
.modal-content::-webkit-scrollbar {
  width: 8px;
}

.modal-content::-webkit-scrollbar-track {
  background: transparent;
}

.modal-content::-webkit-scrollbar-thumb {
  background-color: rgb(212 212 212); /* neutral-300 */
  border-radius: 4px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background-color: rgb(163 163 163); /* neutral-400 */
}

.dark .modal-content::-webkit-scrollbar-thumb {
  background-color: rgb(82 82 82); /* neutral-600 */
}

.dark .modal-content::-webkit-scrollbar-thumb:hover {
  background-color: rgb(115 115 115); /* neutral-500 */
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
