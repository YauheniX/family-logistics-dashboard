<template>
  <div v-if="shoppingStore.currentList" class="space-y-6">
    <BaseCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">Shopping List</p>
            <h2 class="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              {{ shoppingStore.currentList.title }}
            </h2>
            <p
              v-if="shoppingStore.currentList.description"
              class="mt-1 text-sm text-neutral-600 dark:text-neutral-400"
            >
              {{ shoppingStore.currentList.description }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <BaseButton variant="primary" @click="showAddItemForm = true">
              + Add Item
            </BaseButton>
            <BaseButton variant="ghost" @click="router.back()">← Back</BaseButton>
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

    <!-- Add Item Form -->
    <BaseCard v-if="showAddItemForm">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Add Item</h3>
          <button
            type="button"
            class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            @click="showAddItemForm = false"
          >
            ✕
          </button>
        </div>
      </template>
      <form class="grid gap-4 md:grid-cols-3" @submit.prevent="handleAddItem">
        <BaseInput
          v-model="newItemTitle"
          placeholder="Item name"
          class="md:col-span-2"
          required
        />
        <BaseInput
          v-model="newItemQuantity"
          type="number"
          placeholder="Qty"
          :model-value="String(newItemQuantity)"
          @update:model-value="newItemQuantity = Number($event) || 1"
        />
        <BaseInput
          v-model="newItemCategory"
          placeholder="Category (e.g. Produce, Dairy)"
          class="md:col-span-3"
        />
        <BaseButton type="submit" variant="primary" class="md:col-span-3" full-width>
          Add item
        </BaseButton>
      </form>
    </BaseCard>
  </div>
  <LoadingState v-else message="Loading shopping list..." />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import { useAuthStore } from '@/stores/auth';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';
import type { ShoppingItem } from '@/features/shared/domain/entities';

const props = defineProps<{ listId: string }>();

const router = useRouter();
const authStore = useAuthStore();
const shoppingStore = useShoppingStore();

const showPurchased = ref(true);
const showOnlyMine = ref(false);
const showAddItemForm = ref(false);
const newItemTitle = ref('');
const newItemQuantity = ref(1);
const newItemCategory = ref('');

onMounted(async () => {
  await shoppingStore.loadList(props.listId);
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

const handleAddItem = async () => {
  if (!newItemTitle.value.trim()) return;
  await shoppingStore.addItem({
    list_id: props.listId,
    title: newItemTitle.value.trim(),
    quantity: newItemQuantity.value || 1,
    category: newItemCategory.value.trim() || 'Uncategorized',
  });
  newItemTitle.value = '';
  newItemQuantity.value = 1;
  newItemCategory.value = '';
  showAddItemForm.value = false;
};
</script>
