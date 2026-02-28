<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div
          class="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-normal"
          @click="$emit('close')"
        />
        <div
          class="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-card bg-white dark:bg-neutral-800 shadow-xl border border-neutral-200 dark:border-neutral-700 my-auto animate-scale-in"
        >
          <div
            class="flex items-center justify-between p-6 flex-shrink-0 border-b border-neutral-200 dark:border-neutral-700"
          >
            <h3 class="text-h2 text-neutral-900 dark:text-neutral-50">{{ title }}</h3>
            <button
              type="button"
              class="rounded-md p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-normal focus-ring"
              aria-label="Close modal"
              @click="$emit('close')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div class="modal-content px-6 pb-6 pt-4 overflow-y-auto flex-1">
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
  scrollbar-color: rgb(212 212 212) transparent;
}

.dark .modal-content {
  scrollbar-color: rgb(82 82 82) transparent;
}

.modal-content::-webkit-scrollbar {
  width: 8px;
}

.modal-content::-webkit-scrollbar-track {
  background: transparent;
}

.modal-content::-webkit-scrollbar-thumb {
  background-color: rgb(212 212 212);
  border-radius: 4px;
  transition: background-color 0.2s;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background-color: rgb(163 163 163);
}

.dark .modal-content::-webkit-scrollbar-thumb {
  background-color: rgb(82 82 82);
}

.dark .modal-content::-webkit-scrollbar-thumb:hover {
  background-color: rgb(115 115 115);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .animate-scale-in,
.modal-leave-active .animate-scale-in {
  transition: all 0.2s ease;
}

.modal-enter-from .animate-scale-in,
.modal-leave-to .animate-scale-in {
  transform: scale(0.95);
  opacity: 0;
}
</style>
