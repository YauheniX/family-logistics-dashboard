<template>
  <div v-if="shoppingStore.currentList" class="space-y-6">
    <div class="glass-card flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <p class="text-sm text-slate-500">Shopping List</p>
        <h2 class="text-2xl font-semibold text-slate-900">{{ shoppingStore.currentList.title }}</h2>
        <p v-if="shoppingStore.currentList.description" class="mt-1 text-sm text-slate-600">
          {{ shoppingStore.currentList.description }}
        </p>
      </div>
      <button class="btn-ghost" type="button" @click="router.back()">← Back</button>
    </div>

    <!-- Filters -->
    <div class="glass-card flex flex-wrap gap-3 p-4">
      <label class="flex items-center gap-2 text-sm text-slate-700">
        <input v-model="showPurchased" type="checkbox" class="h-4 w-4" />
        Show purchased
      </label>
      <label class="flex items-center gap-2 text-sm text-slate-700">
        <input v-model="showOnlyMine" type="checkbox" class="h-4 w-4" />
        Show only mine
      </label>
    </div>

    <!-- Items by Category -->
    <div v-for="(categoryItems, category) in filteredByCategory" :key="category" class="glass-card p-5">
      <h3 class="text-lg font-semibold text-slate-900">{{ category }}</h3>
      <div class="mt-3 space-y-2">
        <div
          v-for="item in categoryItems"
          :key="item.id"
          class="flex items-center gap-3"
        >
          <input
            :id="item.id"
            type="checkbox"
            class="h-4 w-4"
            :checked="item.is_purchased"
            @change="handleTogglePurchased(item.id)"
          />
          <label :for="item.id" class="flex-1 text-sm" :class="item.is_purchased ? 'text-slate-400 line-through' : 'text-slate-800'">
            {{ item.title }}
            <span v-if="item.quantity > 1" class="ml-1 text-xs text-slate-500">×{{ item.quantity }}</span>
          </label>
          <button
            type="button"
            class="rounded-md px-2 text-slate-400 hover:text-red-500"
            @click="shoppingStore.removeItem(item.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <EmptyState
      v-if="!shoppingStore.items.length"
      title="No items yet"
      description="Add items to your shopping list below."
      badge="Shopping"
    />

    <!-- Add Item Form -->
    <div class="glass-card p-5">
      <h3 class="text-lg font-semibold text-slate-900">Add Item</h3>
      <form class="mt-4 grid gap-2 md:grid-cols-3" @submit.prevent="handleAddItem">
        <input
          v-model="newItemTitle"
          class="input md:col-span-2"
          placeholder="Item name"
        />
        <input
          v-model.number="newItemQuantity"
          type="number"
          min="1"
          class="input"
          placeholder="Qty"
        />
        <input
          v-model="newItemCategory"
          class="input md:col-span-3"
          placeholder="Category (e.g. Produce, Dairy)"
        />
        <button class="btn-primary md:col-span-3" type="submit">Add item</button>
      </form>
    </div>
  </div>
  <LoadingState v-else message="Loading shopping list..." />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
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
};
</script>
