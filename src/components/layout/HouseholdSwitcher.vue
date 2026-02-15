<template>
  <div class="relative" ref="dropdownRef">
    <!-- Trigger Button -->
    <button
      @click="toggleDropdown"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      <span class="text-lg" aria-hidden="true">{{ currentHousehold?.emoji || '🏠' }}</span>
      <span class="hidden md:inline max-w-[150px] truncate">
        {{ currentHousehold?.name || 'Select Household' }}
      </span>
      <svg
        class="h-4 w-4 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="isOpen"
      class="absolute left-0 top-full mt-2 w-64 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg z-50"
      role="menu"
      aria-orientation="vertical"
    >
      <!-- Household List -->
      <div class="py-2">
        <div
          v-for="household in households"
          :key="household.id"
          @click="selectHousehold(household.id)"
          class="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
          :class="{
            'bg-primary-50 dark:bg-primary-900/30': household.id === currentHousehold?.id,
          }"
          role="menuitem"
        >
          <span class="text-lg" aria-hidden="true">{{ household.emoji || '🏠' }}</span>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-sm text-neutral-900 dark:text-neutral-50 truncate">
              {{ household.name }}
            </p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
              {{ household.role }}
            </p>
          </div>
          <svg
            v-if="household.id === currentHousehold?.id"
            class="h-5 w-5 text-primary-600 dark:text-primary-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </div>

      <!-- Divider -->
      <div class="border-t border-neutral-200 dark:border-neutral-700"></div>

      <!-- Create New Household -->
      <div class="py-2">
        <button
          @click="createNewHousehold"
          class="flex items-center gap-3 px-4 py-2 w-full text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
          role="menuitem"
        >
          <span class="text-lg" aria-hidden="true">➕</span>
          <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Create New Household
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useHouseholdStore } from '@/stores/household';
import { useToastStore } from '@/stores/toast';

const householdStore = useHouseholdStore();
const toastStore = useToastStore();

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const currentHousehold = computed(() => householdStore.currentHousehold);
const households = computed(() => householdStore.households);

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function selectHousehold(householdId: string) {
  householdStore.switchHousehold(householdId);
  isOpen.value = false;
  toastStore.info(`Switched to ${householdStore.currentHousehold?.name}`);
}

function createNewHousehold() {
  isOpen.value = false;
  // TODO: Open create household modal
  toastStore.info('Create household feature coming soon!');
}

function closeDropdown() {
  isOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown();
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeDropdown();
  }
}

// Keyboard shortcut: Cmd/Ctrl + K
function handleKeyboardShortcut(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault();
    toggleDropdown();
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleEscape);
  document.addEventListener('keydown', handleKeyboardShortcut);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleEscape);
  document.removeEventListener('keydown', handleKeyboardShortcut);
});
</script>
