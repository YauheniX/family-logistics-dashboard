import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useToastStore } from '@/stores/toast';
import { shoppingService } from '@/features/shopping/domain/shopping.service';
import type {
  ShoppingList,
  ShoppingItem,
  CreateShoppingListDto,
  UpdateShoppingListDto,
  CreateShoppingItemDto,
  UpdateShoppingItemDto,
} from '@/features/shared/domain/entities';

export const useShoppingStore = defineStore('shopping', () => {
  // ─── State ───────────────────────────────────────────────
  const lists = ref<ShoppingList[]>([]);
  const currentList = ref<ShoppingList | null>(null);
  const items = ref<ShoppingItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ─── Getters ─────────────────────────────────────────────
  const itemsByCategory = computed(() => {
    const grouped: Record<string, ShoppingItem[]> = {};
    for (const item of items.value) {
      const category = item.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    }
    return grouped;
  });

  const purchasedItems = computed(() => items.value.filter((i) => i.is_purchased));

  const unpurchasedItems = computed(() => items.value.filter((i) => !i.is_purchased));

  // ─── Reset ──────────────────────────────────────────────

  /** Reset store to initial state (call on logout) */
  function $reset() {
    lists.value = [];
    currentList.value = null;
    items.value = [];
    loading.value = false;
    error.value = null;
  }

  /** Set current list (use instead of direct mutation) */
  function setCurrentList(list: ShoppingList | null) {
    currentList.value = list;
  }

  // ─── List Actions ───────────────────────────────────────

  function clearLists() {
    lists.value = [];
  }

  async function loadLists(householdId: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await shoppingService.getHouseholdLists(householdId);
      if (response.error) {
        error.value = response.error.message;
        useToastStore().error(`Failed to load shopping lists: ${response.error.message}`);
      } else {
        lists.value = response.data ?? [];
      }
    } finally {
      loading.value = false;
    }
  }

  async function loadList(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await shoppingService.getList(id);
      if (response.error) {
        error.value = response.error.message;
        useToastStore().error(`Failed to load shopping list: ${response.error.message}`);
      } else {
        currentList.value = response.data;
        if (currentList.value) {
          await loadItems(id);
        }
      }
    } finally {
      loading.value = false;
    }
  }

  async function createList(data: CreateShoppingListDto) {
    loading.value = true;
    try {
      const response = await shoppingService.createList(data);
      if (response.error) {
        useToastStore().error(`Failed to create shopping list: ${response.error.message}`);
        return null;
      }
      if (response.data) {
        lists.value.unshift(response.data);
        useToastStore().success('Shopping list created successfully!');
      }
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  async function updateList(id: string, data: UpdateShoppingListDto) {
    loading.value = true;
    try {
      const response = await shoppingService.updateList(id, data);
      if (response.error) {
        useToastStore().error(`Failed to update shopping list: ${response.error.message}`);
        return null;
      }
      if (response.data) {
        lists.value = lists.value.map((l) => (l.id === id ? response.data! : l));
        currentList.value = response.data;
        useToastStore().success('Shopping list updated successfully!');
      }
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  async function archiveList(id: string) {
    loading.value = true;
    try {
      const response = await shoppingService.archiveList(id);
      if (response.error) {
        useToastStore().error(`Failed to archive shopping list: ${response.error.message}`);
        return null;
      }
      if (response.data) {
        lists.value = lists.value.map((l) => (l.id === id ? response.data! : l));
        useToastStore().success('Shopping list archived successfully!');
      }
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  async function removeList(id: string) {
    loading.value = true;
    try {
      const response = await shoppingService.deleteList(id);
      if (response.error) {
        useToastStore().error(`Failed to delete shopping list: ${response.error.message}`);
      } else {
        lists.value = lists.value.filter((l) => l.id !== id);
        useToastStore().success('Shopping list deleted successfully!');
      }
    } finally {
      loading.value = false;
    }
  }

  // ─── Item Actions ───────────────────────────────────────

  async function loadItems(listId: string) {
    const response = await shoppingService.getListItems(listId);
    if (response.error) {
      useToastStore().error(`Failed to load items: ${response.error.message}`);
    } else {
      items.value = response.data ?? [];
    }
  }

  async function addItem(data: CreateShoppingItemDto) {
    const response = await shoppingService.addItem(data);
    if (response.error) {
      useToastStore().error(`Failed to add item: ${response.error.message}`);
      return null;
    }
    if (response.data) {
      items.value.push(response.data);
      useToastStore().success('Item added successfully!');
    }
    return response.data;
  }

  async function updateItem(id: string, data: UpdateShoppingItemDto) {
    const response = await shoppingService.updateItem(id, data);
    if (response.error) {
      useToastStore().error(`Failed to update item: ${response.error.message}`);
      return null;
    }
    if (response.data) {
      items.value = items.value.map((i) => (i.id === id ? response.data! : i));
      useToastStore().success('Item updated successfully!');
    }
    return response.data;
  }

  async function togglePurchased(id: string, purchasedBy: string | null) {
    const response = await shoppingService.togglePurchased(id, purchasedBy);
    if (response.error) {
      useToastStore().error(`Failed to update item: ${response.error.message}`);
      return null;
    }
    if (response.data) {
      items.value = items.value.map((i) => (i.id === id ? response.data! : i));
    }
    return response.data;
  }

  async function removeItem(id: string) {
    const response = await shoppingService.deleteItem(id);
    if (response.error) {
      useToastStore().error(`Failed to delete item: ${response.error.message}`);
    } else {
      items.value = items.value.filter((i) => i.id !== id);
      useToastStore().success('Item deleted successfully!');
    }
  }

  return {
    // State
    lists,
    currentList,
    items,
    loading,
    error,
    // Getters
    itemsByCategory,
    purchasedItems,
    unpurchasedItems,
    // Reset & Setters
    $reset,
    setCurrentList,
    // List Actions
    clearLists,
    loadLists,
    loadList,
    createList,
    updateList,
    archiveList,
    removeList,
    // Item Actions
    loadItems,
    addItem,
    updateItem,
    togglePurchased,
    removeItem,
  };
});
