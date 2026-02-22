<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Shopping Lists</h3>
        <BaseButton variant="primary" @click="showCreateListModal = true"> + New List </BaseButton>
      </div>

      <div
        v-if="!householdStore.currentHousehold"
        class="text-sm text-neutral-500 dark:text-neutral-400"
      >
        No household selected. Please select a household to view shopping lists.
      </div>

      <div v-else>
        <div v-if="shoppingStore.lists.length" class="space-y-2">
          <RouterLink
            v-for="list in shoppingStore.lists"
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
        <p v-else class="text-sm text-neutral-500 dark:text-neutral-400">No shopping lists yet.</p>
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
import { onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useHouseholdStore } from '@/stores/household';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';

const router = useRouter();
const householdStore = useHouseholdStore();
const shoppingStore = useShoppingStore();

const showCreateListModal = ref(false);
const newListTitle = ref('');
const newListDescription = ref('');

const handleCreateList = async () => {
  const currentHousehold = householdStore.currentHousehold;
  if (!newListTitle.value.trim() || !currentHousehold?.id) return;
  const result = await shoppingStore.createList({
    household_id: String(currentHousehold.id),
    title: newListTitle.value.trim(),
    description: newListDescription.value.trim() || null,
  });
  if (result) {
    shoppingStore.currentList = result;
    newListTitle.value = '';
    newListDescription.value = '';
    showCreateListModal.value = false;
    await shoppingStore.loadLists(String(currentHousehold.id));
    router.push({ name: 'shopping-list', params: { listId: result.id } });
  }
};

onMounted(async () => {
  const currentHousehold = householdStore.currentHousehold;
  if (currentHousehold?.id) {
    await shoppingStore.loadLists(currentHousehold.id);
  }
});

// Watch for household changes and reload lists
watch(
  () => householdStore.currentHousehold,
  async (newHousehold) => {
    if (newHousehold?.id) {
      await shoppingStore.loadLists(newHousehold.id);
    } else {
      // Clear lists if no household selected
      shoppingStore.clearLists();
    }
  },
);
</script>
