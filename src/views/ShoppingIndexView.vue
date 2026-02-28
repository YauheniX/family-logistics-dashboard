<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Shopping Lists
          </h3>
          <BaseButton
            variant="primary"
            :disabled="!isHouseholdReady"
            :title="
              !householdStore.initialized
                ? 'Loading household...'
                : !householdStore.currentHousehold
                  ? 'Select a household first'
                  : undefined
            "
            @click="showCreateListModal = true"
          >
            + New List
          </BaseButton>
        </div>

        <!-- Status Tabs -->
        <div
          class="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-1 bg-neutral-50 dark:bg-neutral-800"
        >
          <button
            type="button"
            class="status-tab-btn"
            :class="{ active: statusFilter === 'active' }"
            @click="statusFilter = 'active'"
          >
            📝 Active
          </button>
          <button
            type="button"
            class="status-tab-btn"
            :class="{ active: statusFilter === 'archived' }"
            @click="statusFilter = 'archived'"
          >
            📦 Archived
          </button>
        </div>
      </div>

      <div
        v-if="!householdStore.initialized"
        class="text-sm text-neutral-500 dark:text-neutral-400 mt-4"
      >
        ⏳ Loading household data...
      </div>

      <div
        v-else-if="!householdStore.currentHousehold"
        class="text-sm text-neutral-500 dark:text-neutral-400 mt-4"
      >
        No household selected. Please select a household to view shopping lists.
      </div>

      <div v-else class="mt-4">
        <div v-if="filteredLists.length" class="space-y-2">
          <RouterLink
            v-for="list in filteredLists"
            :key="list.id"
            :to="{ name: 'shopping-list', params: { listId: list.id } }"
            class="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <div>
              <p class="font-medium text-neutral-800 dark:text-neutral-200">{{ list.title }}</p>
              <p v-if="list.description" class="text-xs text-neutral-500 dark:text-neutral-400">
                {{ list.description }}
              </p>
            </div>
            <BaseBadge :variant="list.status === 'active' ? 'success' : 'neutral'">{{
              list.status
            }}</BaseBadge>
          </RouterLink>
        </div>
        <p v-else class="text-sm text-neutral-500 dark:text-neutral-400">
          No {{ statusFilter }} shopping lists.
        </p>
      </div>
    </BaseCard>
  </div>
  <ModalDialog
    :open="showCreateListModal"
    title="New Shopping List"
    @close="showCreateListModal = false"
  >
    <form class="space-y-4" @submit.prevent="handleCreateList">
      <div>
        <label class="label" for="list-title">Title</label>
        <BaseInput id="list-title" v-model="newListTitle" required placeholder="Weekly groceries" />
      </div>
      <div>
        <label class="label" for="list-description">Description</label>
        <BaseInput
          id="list-description"
          v-model="newListDescription"
          placeholder="Optional description"
        />
      </div>
      <div class="flex gap-3">
        <BaseButton type="submit"> Create </BaseButton>
        <BaseButton variant="ghost" @click.prevent="showCreateListModal = false">
          Cancel
        </BaseButton>
      </div>
    </form>
  </ModalDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useHouseholdStore } from '@/stores/household';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';
import { useToastStore } from '@/stores/toast';

const router = useRouter();
const householdStore = useHouseholdStore();
const shoppingStore = useShoppingStore();
const toastStore = useToastStore();

const showCreateListModal = ref(false);
const newListTitle = ref('');
const newListDescription = ref('');
const statusFilter = ref<'active' | 'archived'>('active');

// Computed: Check if household is ready for operations
const isHouseholdReady = computed(
  () => householdStore.initialized && !!householdStore.currentHousehold,
);

const filteredLists = computed(() => {
  return shoppingStore.lists.filter((list) => list.status === statusFilter.value);
});

const handleCreateList = async () => {
  // CRITICAL: Wait for household store initialization before creating list
  if (!householdStore.initialized) {
    toastStore.warning('Loading household data, please wait...');
    return;
  }

  const currentHousehold = householdStore.currentHousehold;
  if (!newListTitle.value.trim() || !currentHousehold?.id) return;

  const result = await shoppingStore.createList({
    household_id: String(currentHousehold.id),
    title: newListTitle.value.trim(),
    description: newListDescription.value.trim() || null,
  });
  if (result) {
    shoppingStore.setCurrentList(result);
    newListTitle.value = '';
    newListDescription.value = '';
    showCreateListModal.value = false;
    await shoppingStore.loadLists(String(currentHousehold.id));
    router.push({ name: 'shopping-list', params: { listId: result.id } });
  }
};

onMounted(async () => {
  // Wait for household store initialization if needed
  if (!householdStore.initialized) {
    console.log('[ShoppingIndex] Waiting for household store initialization...');
    // Watch for initialization to complete
    const unwatch = watch(
      () => householdStore.initialized,
      async (isInitialized) => {
        if (isInitialized) {
          unwatch();
          const currentHousehold = householdStore.currentHousehold;
          if (currentHousehold?.id) {
            await shoppingStore.loadLists(currentHousehold.id);
          }
        }
      },
      { immediate: true },
    );
  } else {
    // Already initialized, proceed normally
    const currentHousehold = householdStore.currentHousehold;
    if (currentHousehold?.id) {
      await shoppingStore.loadLists(currentHousehold.id);
    }
  }
});

// Watch for household changes and reload lists
watch(
  () => householdStore.currentHousehold,
  async (newHousehold) => {
    // Only proceed if store is initialized
    if (!householdStore.initialized) return;

    if (newHousehold?.id) {
      await shoppingStore.loadLists(newHousehold.id);
    } else {
      // Clear lists if no household selected
      shoppingStore.clearLists();
    }
  },
);
</script>

<style scoped>
.status-tab-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(100 116 139);
  background-color: transparent;
  transition: all 0.2s;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}

.status-tab-btn:hover {
  color: rgb(51 65 85);
}

.status-tab-btn.active {
  background-color: rgb(255 255 255);
  color: rgb(59 130 246);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.dark .status-tab-btn {
  color: rgb(148 163 184);
}

.dark .status-tab-btn:hover {
  color: rgb(203 213 225);
}

.dark .status-tab-btn.active {
  background-color: rgb(51 65 85);
  color: rgb(96 165 250);
}

@media (max-width: 640px) {
  .status-tab-btn {
    padding: 0.625rem 1rem;
  }
}
</style>
