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
  const householdWishlists = ref<Wishlist[]>([]);
  const currentWishlist = ref<Wishlist | null>(null);
  const items = ref<WishlistItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Request tracking to prevent stale data
  let currentHouseholdRequestId = 0;

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

  // ─── Reset ──────────────────────────────────────────────

  /** Reset store to initial state (call on logout) */
  function $reset() {
    wishlists.value = [];
    householdWishlists.value = [];
    currentWishlist.value = null;
    items.value = [];
    loading.value = false;
    error.value = null;
  }

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

  /**
   * Load wishlists for a user filtered by household.
   * Use this when you want to show only wishlists for the currently selected household.
   * Uses request token pattern to prevent stale data from out-of-order responses.
   */
  async function loadWishlistsByHousehold(userId: string, householdId: string) {
    // Increment request ID to track this request
    const requestId = ++currentHouseholdRequestId;

    // Clear existing data immediately to prevent showing stale data
    wishlists.value = [];
    loading.value = true;
    error.value = null;

    try {
      const response = await wishlistService.getUserWishlistsByHousehold(userId, householdId);

      // Only update state if this is still the latest request
      if (requestId !== currentHouseholdRequestId) {
        return; // Stale response, ignore
      }

      if (response.error) {
        error.value = response.error.message;
        wishlists.value = []; // Clear on error
        useToastStore().error(`Failed to load wishlists: ${response.error.message}`);
      } else {
        wishlists.value = response.data ?? [];
      }
    } catch (err) {
      // Only update state if this is still the latest request
      if (requestId === currentHouseholdRequestId) {
        error.value = err instanceof Error ? err.message : 'Failed to load wishlists';
        wishlists.value = []; // Clear on error
      }
    } finally {
      // Only reset loading if this is still the latest request
      if (requestId === currentHouseholdRequestId) {
        loading.value = false;
      }
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

  async function loadHouseholdWishlists(householdId: string, excludeUserId: string) {
    try {
      const response = await wishlistService.getHouseholdWishlists(householdId, excludeUserId);
      if (response.error) {
        // Silently fail - household wishlists are optional
        householdWishlists.value = [];
      } else {
        householdWishlists.value = response.data ?? [];
      }
    } catch {
      householdWishlists.value = [];
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
   * Requires email for both reserving and unreserving
   */
  async function reserveItem(
    id: string,
    name?: string,
    email?: string,
  ): Promise<WishlistItem | null> {
    const response = await wishlistService.reserveItem(id, name, email);
    if (response.error) {
      useToastStore().error(`Failed to update reservation: ${response.error.message}`);
      return null;
    }
    if (response.data) {
      const updatedItem: WishlistItem = response.data;
      items.value = items.value.map((i) => (i.id === id ? updatedItem : i));
      return updatedItem;
    }
    return null;
  }

  return {
    // State
    wishlists,
    householdWishlists,
    currentWishlist,
    items,
    loading,
    error,
    // Getters
    reservedItems,
    unreservedItems,
    itemsByPriority,
    // Reset
    $reset,
    // Wishlist Actions
    loadWishlists,
    loadWishlistsByHousehold,
    loadHouseholdWishlists,
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
