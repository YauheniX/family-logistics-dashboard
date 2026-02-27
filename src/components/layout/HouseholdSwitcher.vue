<template>
  <div ref="dropdownRef" class="relative">
    <!-- Trigger Button -->
    <button
      :aria-expanded="isOpen"
      aria-haspopup="true"
      class="flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      @click="toggleDropdown"
    >
      <span class="md:inline max-w-[100px] truncate">
        {{ currentHousehold?.name || 'Select Household' }}
      </span>
      <svg
        class="h-6 w-6 transition-transform"
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
        <button
          v-for="household in households"
          :key="household.id"
          type="button"
          class="flex items-center gap-3 px-4 py-2 w-full text-left cursor-pointer transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
          :class="{
            'bg-primary-50 dark:bg-primary-900/30': household.id === currentHousehold?.id,
          }"
          role="menuitem"
          @click="selectHousehold(household.id)"
        >
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
        </button>
      </div>

      <!-- Divider -->
      <div class="border-t border-neutral-200 dark:border-neutral-700"></div>

      <!-- Create New Household -->
      <div class="py-2">
        <button
          class="flex items-center gap-3 px-4 py-2 w-full text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
          role="menuitem"
          @click="openCreateModal"
        >
          <span class="text-lg" aria-hidden="true">➕</span>
          <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Create New Household
          </span>
        </button>
      </div>

      <!-- No Household Selected Message -->
      <div v-if="!currentHousehold" class="py-2 px-4">
        <p class="text-xs text-neutral-500 dark:text-neutral-400 text-center">
          Select a household above
        </p>
      </div>
    </div>

    <ModalDialog :open="showCreateModal" title="Create Household" @close="showCreateModal = false">
      <form @submit.prevent="submitCreateHousehold">
        <div>
          <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >Household name</label
          >
          <BaseInput v-model="newHouseholdName" placeholder="e.g. Smith Family" autofocus />
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <BaseButton variant="ghost" type="button" @click.prevent="showCreateModal = false"
            >Cancel</BaseButton
          >
          <BaseButton type="submit">Create</BaseButton>
        </div>
      </form>
    </ModalDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useHouseholdStore } from '@/stores/household';
import { useToastStore } from '@/stores/toast';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseInput from '@/components/shared/BaseInput.vue';

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

const showCreateModal = ref(false);
const newHouseholdName = ref('');

function openCreateModal() {
  isOpen.value = false;
  newHouseholdName.value = '';
  showCreateModal.value = true;
}

async function submitCreateHousehold() {
  if (!newHouseholdName.value.trim()) {
    toastStore.error('Household name is required');
    return;
  }

  const result = await householdStore.createHousehold(newHouseholdName.value.trim());
  if (result) {
    toastStore.success(`Created household "${result.name}"`);
    showCreateModal.value = false;
  } else {
    // createHousehold shows detailed toast on failure
  }
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
