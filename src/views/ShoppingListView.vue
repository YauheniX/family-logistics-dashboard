<template>
  <div v-if="shoppingStore.currentList" class="space-y-6">
    <BaseCard>
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div class="min-w-0">
            <p class="text-sm text-neutral-500 dark:text-neutral-400">Shopping List</p>
            <h2 class="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              {{ shoppingStore.currentList.title }}
            </h2>
            <p
              v-if="shoppingStore.currentList.description"
              class="mt-1 text-sm text-neutral-600 dark:text-neutral-400"
            >
              {{ shoppingStore.currentList.description }}
            </p>
          </div>
          <div
            class="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 w-full sm:w-auto"
          >
            <BaseButton variant="ghost" class="w-full xs:w-auto" @click="showEditListModal = true"
              >✏️ Edit List</BaseButton
            >
            <BaseButton variant="danger" class="w-full xs:w-auto" @click="showDeleteModal = true"
              >🗑️ Delete</BaseButton
            >
            <BaseButton variant="primary" class="w-full xs:w-auto" @click="openAddItemModal">
              + Add Item
            </BaseButton>
          </div>
        </div>
      </template>
    </BaseCard>

    <!-- Filters -->
    <BaseCard :padding="true">
      <div class="flex flex-wrap gap-4">
        <label class="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input v-model="showPurchased" type="checkbox" class="checkbox" />
          Show purchased
        </label>
        <label class="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input v-model="showOnlyMine" type="checkbox" class="checkbox" />
          Show only mine
        </label>
      </div>
    </BaseCard>

    <!-- Items by Category -->
    <BaseCard
      v-for="(categoryItems, category) in filteredByCategory"
      :key="category"
      :padding="false"
    >
      <div class="border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{{ category }}</h3>
      </div>
      <div class="divide-y divide-neutral-200 dark:divide-neutral-700">
        <div
          v-for="item in categoryItems"
          :key="item.id"
          class="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
        >
          <input
            :id="item.id"
            type="checkbox"
            class="checkbox"
            :checked="item.is_purchased"
            @change="handleTogglePurchased(item.id)"
          />
          <label
            :for="item.id"
            class="flex-1 cursor-pointer text-sm"
            :class="
              item.is_purchased
                ? 'text-neutral-400 dark:text-neutral-500 line-through'
                : 'text-neutral-800 dark:text-neutral-200'
            "
          >
            {{ item.title }}
          </label>
          <BaseBadge v-if="item.quantity > 1" variant="neutral">×{{ item.quantity }}</BaseBadge>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            aria-label="Edit item"
            @click="handleEditItem(item)"
          >
            ✏️
          </button>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-neutral-400 hover:text-danger-500 dark:hover:text-danger-400 transition-colors"
            aria-label="Remove item"
            @click="shoppingStore.removeItem(item.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </BaseCard>

    <EmptyState
      v-if="!shoppingStore.items.length"
      title="No items yet"
      description="Add items to your shopping list below."
      badge="Shopping"
    />

    <!-- Add/Edit Item Modal -->
    <ModalDialog
      :open="showItemModal"
      :title="editingItemId ? 'Edit Item' : 'Add Item'"
      @close="resetForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmitItem">
        <BaseInput v-model="newItemTitle" placeholder="Item name" required />
        <div>
          <label id="quantity-label" class="label">Quantity</label>
          <div role="group" aria-labelledby="quantity-label" class="flex items-center gap-3">
            <button
              type="button"
              :disabled="newItemQuantity <= 1"
              :aria-disabled="newItemQuantity <= 1"
              class="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-lg font-medium transition-opacity dark:border-neutral-700 dark:bg-neutral-800"
              :class="
                newItemQuantity <= 1
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
              "
              aria-label="Decrease quantity"
              @click="newItemQuantity = Math.max(1, newItemQuantity - 1)"
            >
              −
            </button>
            <span aria-live="polite" class="w-12 text-center text-lg font-medium">{{
              newItemQuantity
            }}</span>
            <button
              type="button"
              :disabled="newItemQuantity >= MAX_QUANTITY"
              :aria-disabled="newItemQuantity >= MAX_QUANTITY"
              class="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-lg font-medium transition-opacity dark:border-neutral-700 dark:bg-neutral-800"
              :class="
                newItemQuantity >= MAX_QUANTITY
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
              "
              aria-label="Increase quantity"
              @click="newItemQuantity = Math.min(newItemQuantity + 1, MAX_QUANTITY)"
            >
              +
            </button>
          </div>
        </div>
        <BaseInput v-model="newItemCategory" placeholder="Category (e.g. Produce, Dairy)" />
        <div class="flex gap-3">
          <BaseButton type="submit" variant="primary">
            {{ editingItemId ? 'Update Item' : 'Add Item' }}
          </BaseButton>
          <BaseButton type="button" variant="ghost" @click="resetForm">Cancel</BaseButton>
        </div>
      </form>
    </ModalDialog>

    <!-- Edit List Modal -->
    <ModalDialog
      :open="showEditListModal"
      title="Edit Shopping List"
      @close="showEditListModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleUpdateList">
        <div>
          <label class="label" for="edit-list-title">Title</label>
          <BaseInput
            id="edit-list-title"
            v-model="editListTitle"
            required
            placeholder="Weekly groceries"
          />
        </div>
        <div>
          <label class="label" for="edit-list-description">Description</label>
          <BaseInput
            id="edit-list-description"
            v-model="editListDescription"
            placeholder="Optional description"
          />
        </div>
        <div class="flex gap-3">
          <BaseButton type="submit">Update</BaseButton>
          <BaseButton variant="ghost" @click.prevent="showEditListModal = false">
            Cancel
          </BaseButton>
        </div>
      </form>
    </ModalDialog>

    <!-- Delete Confirmation Modal -->
    <ModalDialog
      :open="showDeleteModal"
      title="Delete Shopping List"
      @close="showDeleteModal = false"
    >
      <div class="space-y-4">
        <p class="text-sm text-neutral-600 dark:text-neutral-300">
          Are you sure you want to delete
          <span class="font-semibold">{{ shoppingStore.currentList?.title }}</span
          >? This action cannot be undone.
        </p>
        <div class="flex gap-3">
          <BaseButton variant="danger" @click="handleDeleteList">Delete</BaseButton>
          <BaseButton variant="ghost" @click="showDeleteModal = false">Cancel</BaseButton>
        </div>
      </div>
    </ModalDialog>
  </div>
  <LoadingState v-else message="Loading shopping list..." />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';
import { useToastStore } from '@/stores/toast';
import { useHouseholdStore } from '@/stores/household';
import type { ShoppingItem } from '@/features/shared/domain/entities';

const props = defineProps<{ listId: string }>();

const router = useRouter();
const authStore = useAuthStore();
const shoppingStore = useShoppingStore();
const toastStore = useToastStore();
const householdStore = useHouseholdStore();

const MAX_QUANTITY = 999;

const showPurchased = ref(true);
const showOnlyMine = ref(false);
const showEditListModal = ref(false);
const showDeleteModal = ref(false);
const showItemModal = ref(false);
const editingItemId = ref<string | null>(null);
const newItemTitle = ref('');
const newItemQuantity = ref(1);
const newItemCategory = ref('');
const editListTitle = ref('');
const editListDescription = ref('');

onMounted(async () => {
  await shoppingStore.loadList(props.listId);
  if (shoppingStore.currentList) {
    editListTitle.value = shoppingStore.currentList.title;
    editListDescription.value = shoppingStore.currentList.description || '';
  }
});

const filteredItems = computed(() => {
  let result: ShoppingItem[] = shoppingStore.items;
  if (!showPurchased.value) {
    result = result.filter((i) => !i.is_purchased);
  }
  if (showOnlyMine.value && authStore.user?.id) {
    result = result.filter((i) => i.added_by === authStore.user!.id);
  }
  return result;
});

const filteredByCategory = computed(() => {
  const grouped: Record<string, ShoppingItem[]> = {};
  for (const item of filteredItems.value) {
    const category = item.category || 'Uncategorized';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(item);
  }
  return grouped;
});

const handleTogglePurchased = async (itemId: string) => {
  await shoppingStore.togglePurchased(itemId, authStore.user?.id ?? null);
};

const handleEditItem = (item: ShoppingItem) => {
  editingItemId.value = item.id;
  newItemTitle.value = item.title;
  newItemQuantity.value = item.quantity || 1;
  newItemCategory.value = item.category || '';
  showItemModal.value = true;
};

const openAddItemModal = () => {
  editingItemId.value = null;
  newItemTitle.value = '';
  newItemQuantity.value = 1;
  newItemCategory.value = '';
  showItemModal.value = true;
};

const resetForm = () => {
  editingItemId.value = null;
  newItemTitle.value = '';
  newItemQuantity.value = 1;
  newItemCategory.value = '';
  showItemModal.value = false;
};

const handleSubmitItem = async () => {
  if (!newItemTitle.value.trim()) return;

  try {
    if (editingItemId.value) {
      // Update existing item
      await shoppingStore.updateItem(editingItemId.value, {
        title: newItemTitle.value.trim(),
        quantity: newItemQuantity.value || 1,
        category: newItemCategory.value.trim() || 'Uncategorized',
      });
    } else {
      // Add new item
      await shoppingStore.addItem({
        list_id: props.listId,
        title: newItemTitle.value.trim(),
        quantity: newItemQuantity.value || 1,
        category: newItemCategory.value.trim() || 'Uncategorized',
      });
    }
    resetForm();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save item';
    toastStore.error(message);
  }
};

const handleUpdateList = async () => {
  if (!editListTitle.value.trim()) return;
  await shoppingStore.updateList(props.listId, {
    title: editListTitle.value.trim(),
    description: editListDescription.value.trim() || null,
  });
  showEditListModal.value = false;
};

const handleDeleteList = async () => {
  const householdId = shoppingStore.currentList?.household_id;
  await shoppingStore.removeList(props.listId);
  showDeleteModal.value = false;
  // Navigate back to household detail or shopping index
  if (householdId) {
    router.push({ name: 'household-detail', params: { id: householdId } });
  } else {
    router.push({ name: 'shopping' });
  }
};

// Watch for household changes and redirect if the list doesn't belong to the new household
watch(
  () => householdStore.currentHousehold,
  async (newHousehold) => {
    // Wait for loading to complete before checking
    if (shoppingStore.loading) return;

    if (newHousehold && shoppingStore.currentList) {
      // If the current list doesn't belong to the new household, redirect to shopping index
      if (shoppingStore.currentList.household_id !== newHousehold.id) {
        router.push({ name: 'shopping' });
      }
    } else if (newHousehold && props.listId && !shoppingStore.currentList) {
      // If household changed and we have a listId but no current list loaded, redirect
      router.push({ name: 'shopping' });
    }
  },
);
</script>
