import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useToastStore } from '@/stores/toast';
import { wishlistService } from '@/features/wishlist/domain/wishlist.service';
import type {
  Wishlist,
  WishlistItem,
  CreateWishlistDto,
  UpdateWishlistDto,
  CreateWishlistItemDto,
  UpdateWishlistItemDto,
} from '@/features/shared/domain/entities';

export const useWishlistStore = defineStore('wishlist', () => {
  // ─── State ───────────────────────────────────────────────
  const wishlists = ref<Wishlist[]>([]);
  const currentWishlist = ref<Wishlist | null>(null);
  const items = ref<WishlistItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ─── Getters ─────────────────────────────────────────────
  const reservedItems = computed(() => items.value.filter((i) => i.is_reserved));

  const unreservedItems = computed(() => items.value.filter((i) => !i.is_reserved));

  const itemsByPriority = computed(() => {
    const grouped: Record<string, WishlistItem[]> = {};
    for (const item of items.value) {
      const priority = item.priority || 'medium';
      if (!grouped[priority]) {
        grouped[priority] = [];
      }
      grouped[priority].push(item);
    }
    return grouped;
  });

  // ─── Wishlist Actions ──────────────────────────────────────

  async function loadWishlists(userId: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await wishlistService.getUserWishlists(userId);
      if (response.error) {
        error.value = response.error.message;
        useToastStore().error(`Failed to load wishlists: ${response.error.message}`);
      } else {
        wishlists.value = response.data ?? [];
      }
    } finally {
      loading.value = false;
    }
  }

  async function loadWishlist(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await wishlistService.getWishlist(id);
      if (response.error) {
        error.value = response.error.message;
        useToastStore().error(`Failed to load wishlist: ${response.error.message}`);
      } else {
        currentWishlist.value = response.data;
        if (currentWishlist.value) {
          await loadItems(id);
        }
      }
    } finally {
      loading.value = false;
    }
  }

  /**
   * Load a wishlist by its share slug (public access, no auth required)
   */
  async function loadWishlistBySlug(slug: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await wishlistService.getWishlistBySlug(slug);
      if (response.error) {
        error.value = response.error.message;
      } else {
        currentWishlist.value = response.data;
        if (currentWishlist.value) {
          await loadItems(currentWishlist.value.id);
        }
      }
    } finally {
      loading.value = false;
    }
  }

  async function createWishlist(data: CreateWishlistDto) {
    loading.value = true;
    try {
      const response = await wishlistService.createWishlist(data);
      if (response.error) {
        useToastStore().error(`Failed to create wishlist: ${response.error.message}`);
        return null;
      }
      if (response.data) {
        wishlists.value.unshift(response.data);
        useToastStore().success('Wishlist created successfully!');
      }
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  async function updateWishlist(id: string, data: UpdateWishlistDto) {
    loading.value = true;
    try {
      const response = await wishlistService.updateWishlist(id, data);
      if (response.error) {
        useToastStore().error(`Failed to update wishlist: ${response.error.message}`);
        return null;
      }
      if (response.data) {
        wishlists.value = wishlists.value.map((w) => (w.id === id ? response.data! : w));
        currentWishlist.value = response.data;
        useToastStore().success('Wishlist updated successfully!');
      }
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  async function removeWishlist(id: string) {
    loading.value = true;
    try {
      const response = await wishlistService.deleteWishlist(id);
      if (response.error) {
        useToastStore().error(`Failed to delete wishlist: ${response.error.message}`);
      } else {
        wishlists.value = wishlists.value.filter((w) => w.id !== id);
        useToastStore().success('Wishlist deleted successfully!');
      }
    } finally {
      loading.value = false;
    }
  }

  // ─── Item Actions ──────────────────────────────────────────

  async function loadItems(wishlistId: string) {
    const response = await wishlistService.getWishlistItems(wishlistId);
    if (response.error) {
      useToastStore().error(`Failed to load items: ${response.error.message}`);
    } else {
      items.value = response.data ?? [];
    }
  }

  async function addItem(data: CreateWishlistItemDto) {
    const response = await wishlistService.addItem(data);
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

  async function updateItem(id: string, data: UpdateWishlistItemDto) {
    const response = await wishlistService.updateItem(id, data);
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

  async function removeItem(id: string) {
    const response = await wishlistService.deleteItem(id);
    if (response.error) {
      useToastStore().error(`Failed to delete item: ${response.error.message}`);
    } else {
      items.value = items.value.filter((i) => i.id !== id);
      useToastStore().success('Item deleted successfully!');
    }
  }

  /**
   * Toggle reservation on an item (public access, no auth required)
   * Returns reservation_code when reserving
   */
  async function reserveItem(
    id: string,
    name?: string,
    code?: string,
  ): Promise<{ item: WishlistItem; code?: string } | null> {
    const response = await wishlistService.reserveItem(id, name, code);
    if (response.error) {
      useToastStore().error(`Failed to update reservation: ${response.error.message}`);
      return null;
    }
    if (response.data) {
      const updatedItem: WishlistItem = {
        ...response.data,
        reservation_code: response.data.reservation_code ?? null,
      };
      items.value = items.value.map((i) => (i.id === id ? updatedItem : i));
      return { item: updatedItem, code: response.data.reservation_code };
    }
    return null;
  }

  return {
    // State
    wishlists,
    currentWishlist,
    items,
    loading,
    error,
    // Getters
    reservedItems,
    unreservedItems,
    itemsByPriority,
    // Wishlist Actions
    loadWishlists,
    loadWishlist,
    loadWishlistBySlug,
    createWishlist,
    updateWishlist,
    removeWishlist,
    // Item Actions
    loadItems,
    addItem,
    updateItem,
    removeItem,
    reserveItem,
  };
});
