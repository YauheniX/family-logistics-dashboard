<template>
  <div v-if="shoppingStore.currentList" class="space-y-6">
    <BaseCard>
      <template #header>
        <div class="flex flex-col gap-3 sm:gap-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ $t('shopping.list.shoppingLabel') }}</p>
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
            <!-- Mode Toggle -->
            <div
              class="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-1 bg-neutral-50 dark:bg-neutral-800 w-full sm:w-auto"
            >
              <button
                type="button"
                class="mode-toggle-btn"
                :class="{ active: !isEditMode }"
                @click="isEditMode = false"
              >
                {{ $t('shopping.list.modeShopping') }}
              </button>
              <button
                type="button"
                class="mode-toggle-btn"
                :class="{ active: isEditMode }"
                @click="isEditMode = true"
              >
                {{ $t('shopping.list.modeEdit') }}
              </button>
            </div>
          </div>
          <!-- Edit Mode Actions -->
          <div
            v-if="isEditMode"
            class="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 w-full sm:w-auto"
          >
            <BaseButton variant="ghost" class="w-full xs:w-auto" @click="showEditListModal = true">{{ $t('shopping.list.editList') }}</BaseButton>
            <BaseButton
              v-if="shoppingStore.currentList?.status === 'archived'"
              variant="secondary"
              class="w-full xs:w-auto"
              @click="handleUnarchiveList"
            >
              {{ $t('shopping.list.unarchive') }}
            </BaseButton>
            <BaseButton
              v-else
              variant="secondary"
              class="w-full xs:w-auto"
              @click="handleArchiveList"
            >
              {{ $t('shopping.list.archive') }}
            </BaseButton>
            <BaseButton variant="danger" class="w-full xs:w-auto" @click="showDeleteModal = true">{{ $t('shopping.list.delete') }}</BaseButton>
            <BaseButton variant="primary" class="w-full xs:w-auto" @click="openAddItemModal()">
              {{ $t('shopping.list.addItem') }}
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
          {{ $t('shopping.list.showPurchased') }}
        </label>
        <label class="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input v-model="showOnlyMine" type="checkbox" class="checkbox" />
          {{ $t('shopping.list.showOnlyMine') }}
        </label>
      </div>
    </BaseCard>

    <!-- Items by Category -->
    <BaseCard
      v-for="(categoryItems, category) in filteredByCategory"
      :key="category"
      :padding="false"
    >
      <div
        class="border-b border-neutral-200 dark:border-neutral-700 px-4 py-3 flex items-center justify-between"
      >
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{{ category }}</h3>
        <button
          v-if="isEditMode"
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          aria-label="Add item to category"
          @click="openAddItemModal(category)"
        >
          + Add
        </button>
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
            v-if="isEditMode"
            type="button"
            class="rounded-md px-2 py-1 text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            aria-label="Edit item"
            @click="handleEditItem(item)"
          >
            ✏️
          </button>
          <button
            v-if="isEditMode"
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
      :title="$t('shopping.list.noItems')"
      :description="$t('shopping.list.noItemsDescription')"
      badge="Shopping"
    />

    <!-- Add/Edit Item Modal -->
    <ModalDialog
      :open="showItemModal"
      :title="editingItemId ? $t('shopping.list.editItemTitle') : $t('shopping.list.addItemTitle')"
      @close="resetForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmitItem">
        <BaseInput v-model="newItemTitle" :placeholder="$t('shopping.list.itemPlaceholder')" required />
        <div>
          <label id="quantity-label" class="label">{{ $t('shopping.list.quantityLabel') }}</label>
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
        <div>
          <label class="label mb-2 block">{{ $t('shopping.list.categoryLabel') }}</label>
          <BaseInput
            v-model="newItemCategory"
            :placeholder="$t('shopping.list.categoryPlaceholder')"
            :disabled="isCategoryLocked"
          />
          <!-- Quick category buttons -->
          <div v-if="!isCategoryLocked" class="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
            <button
              v-for="cat in categoryOptions"
              :key="cat.value"
              type="button"
              class="category-chip"
              :class="{ active: newItemCategory === cat.value }"
              @click="newItemCategory = cat.value"
            >
              <span class="text-base sm:text-lg">{{ cat.emoji }}</span>
              <span class="text-xs sm:text-sm">{{ cat.label }}</span>
            </button>
          </div>
        </div>
        <div class="flex gap-3">
          <BaseButton type="submit" variant="primary">
            {{ editingItemId ? $t('shopping.list.updateItemAction') : $t('shopping.list.addItemAction') }}
          </BaseButton>
          <BaseButton type="button" variant="ghost" @click="resetForm">{{ $t('common.cancel') }}</BaseButton>
        </div>
      </form>
    </ModalDialog>

    <!-- Edit List Modal -->
    <ModalDialog
      :open="showEditListModal"
      :title="$t('shopping.list.editListTitle')"
      @close="showEditListModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleUpdateList">
        <div>
          <label class="label" for="edit-list-title">{{ $t('shopping.list.listTitleLabel') }}</label>
          <BaseInput
            id="edit-list-title"
            v-model="editListTitle"
            required
            :placeholder="$t('shopping.list.listTitlePlaceholder')"
          />
        </div>
        <div>
          <label class="label" for="edit-list-description">{{ $t('shopping.list.listDescriptionLabel') }}</label>
          <BaseInput
            id="edit-list-description"
            v-model="editListDescription"
            :placeholder="$t('shopping.list.listDescriptionPlaceholder')"
          />
        </div>
        <div class="flex gap-3">
          <BaseButton type="submit">{{ $t('common.update') }}</BaseButton>
          <BaseButton variant="ghost" @click.prevent="showEditListModal = false">
            {{ $t('common.cancel') }}
          </BaseButton>
        </div>
      </form>
    </ModalDialog>

    <!-- Delete Confirmation Modal -->
    <ModalDialog
      :open="showDeleteModal"
      :title="$t('shopping.list.deleteListTitle')"
      @close="showDeleteModal = false"
    >
      <div class="space-y-4">
        <p class="text-sm text-neutral-600 dark:text-neutral-300">
          {{ $t('shopping.list.deleteConfirm', { title: shoppingStore.currentList?.title }) }}
        </p>
        <div class="flex gap-3">
          <BaseButton variant="danger" @click="handleDeleteList">{{ $t('common.delete') }}</BaseButton>
          <BaseButton variant="ghost" @click="showDeleteModal = false">{{ $t('common.cancel') }}</BaseButton>
        </div>
      </div>
    </ModalDialog>
  </div>
  <LoadingState v-else :message="$t('shopping.list.loading')" />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
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
const { t } = useI18n();
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
const isEditMode = ref(false);
const newItemTitle = ref('');
const newItemQuantity = ref(1);
const newItemCategory = ref('');
const isCategoryLocked = ref(false);
const editListTitle = ref('');
const editListDescription = ref('');

// Category options with emojis for quick selection
const categoryOptions = computed(() => [
  { value: 'fruits&vegetables', label: t('shopping.categories.fruitsVegetables'), emoji: '🥕' },
  { value: 'bakery', label: t('shopping.categories.bakery'), emoji: '🍞' },
  { value: 'meat&fish', label: t('shopping.categories.meatFish'), emoji: '🥩' },
  { value: 'beverages', label: t('shopping.categories.beverages'), emoji: '🥤' },
  { value: 'snacks', label: t('shopping.categories.snacks'), emoji: '🍿' },
  { value: 'care', label: t('shopping.categories.care'), emoji: '🧴' },
  { value: 'pharmacy', label: t('shopping.categories.pharmacy'), emoji: '💊' },
  { value: 'gadgets', label: t('shopping.categories.gadgets'), emoji: '📱' },
  { value: 'books', label: t('shopping.categories.books'), emoji: '📚' },
  { value: 'tickets', label: t('shopping.categories.tickets'), emoji: '🎫' },
  { value: 'clothes', label: t('shopping.categories.clothes'), emoji: '👕' },
  { value: 'toys', label: t('shopping.categories.toys'), emoji: '🧸' },
  { value: 'other', label: t('shopping.categories.other'), emoji: '📦' },
]);

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

const openAddItemModal = (category?: string) => {
  editingItemId.value = null;
  newItemTitle.value = '';
  newItemQuantity.value = 1;
  newItemCategory.value = category || '';
  isCategoryLocked.value = !!category;
  showItemModal.value = true;
};

const resetForm = () => {
  editingItemId.value = null;
  newItemTitle.value = '';
  newItemQuantity.value = 1;
  newItemCategory.value = '';
  isCategoryLocked.value = false;
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
    const message = error instanceof Error ? error.message : t('shopping.list.failedToSave');
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

const handleArchiveList = async () => {
  await shoppingStore.updateList(props.listId, { status: 'archived' });
  toastStore.success(t('shopping.list.archiveSuccess'));
  router.push({ name: 'shopping' });
};

const handleUnarchiveList = async () => {
  await shoppingStore.updateList(props.listId, { status: 'active' });
  toastStore.success(t('shopping.list.unarchiveSuccess'));
  // Stay on the list page after unarchiving
};

const handleDeleteList = async () => {
  await shoppingStore.removeList(props.listId);
  showDeleteModal.value = false;
  router.push({ name: 'shopping' });
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

<style scoped>
.category-chip {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid rgb(226 232 240);
  background-color: rgb(255 255 255);
  color: rgb(71 85 105);
  font-weight: 500;
  transition: all 0.2s;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 44px; /* Touch-friendly minimum size */
}

.category-chip:hover {
  background-color: rgb(248 250 252);
  border-color: rgb(59 130 246);
  transform: translateY(-1px);
}

.category-chip:active {
  transform: translateY(0);
}

.category-chip.active {
  background-color: rgb(59 130 246);
  border-color: rgb(59 130 246);
  color: rgb(255 255 255);
}

.dark .category-chip {
  border-color: rgb(74 85 104);
  background-color: rgb(26 32 44);
  color: rgb(203 213 225);
}

.dark .category-chip:hover {
  background-color: rgb(51 65 85);
  border-color: rgb(59 130 246);
}

.dark .category-chip.active {
  background-color: rgb(59 130 246);
  border-color: rgb(59 130 246);
  color: rgb(255 255 255);
}

/* Mobile optimization */
@media (max-width: 640px) {
  .category-chip {
    padding: 0.625rem 0.875rem;
    min-height: 48px; /* Larger touch target on mobile */
  }
}

/* Mode toggle buttons */
.mode-toggle-btn {
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

.mode-toggle-btn:hover {
  color: rgb(51 65 85);
}

.mode-toggle-btn.active {
  background-color: rgb(255 255 255);
  color: rgb(59 130 246);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.dark .mode-toggle-btn {
  color: rgb(148 163 184);
}

.dark .mode-toggle-btn:hover {
  color: rgb(203 213 225);
}

.dark .mode-toggle-btn.active {
  background-color: rgb(51 65 85);
  color: rgb(96 165 250);
}

@media (max-width: 640px) {
  .mode-toggle-btn {
    padding: 0.625rem 1rem;
  }
}
</style>
