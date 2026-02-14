import { shoppingListRepository, shoppingItemRepository } from '../infrastructure/shopping.factory';
import type {
  ShoppingList,
  CreateShoppingListDto,
  UpdateShoppingListDto,
  ShoppingItem,
  CreateShoppingItemDto,
  UpdateShoppingItemDto,
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

/**
 * Shopping service - contains business logic for shopping lists and items
 */
export class ShoppingService {
  // ─── List Operations ──────────────────────────────────────

  /**
   * Get all shopping lists for a family
   */
  async getFamilyLists(familyId: string): Promise<ApiResponse<ShoppingList[]>> {
    return await shoppingListRepository.findByFamilyId(familyId);
  }

  /**
   * Get a single shopping list by ID
   */
  async getList(id: string): Promise<ApiResponse<ShoppingList>> {
    return await shoppingListRepository.findById(id);
  }

  /**
   * Create a new shopping list
   */
  async createList(data: CreateShoppingListDto): Promise<ApiResponse<ShoppingList>> {
    return await shoppingListRepository.create(data);
  }

  /**
   * Update a shopping list
   */
  async updateList(id: string, data: UpdateShoppingListDto): Promise<ApiResponse<ShoppingList>> {
    return await shoppingListRepository.update(id, data);
  }

  /**
   * Archive a shopping list
   */
  async archiveList(id: string): Promise<ApiResponse<ShoppingList>> {
    return await shoppingListRepository.update(id, { status: 'archived' });
  }

  /**
   * Delete a shopping list
   */
  async deleteList(id: string): Promise<ApiResponse<void>> {
    return await shoppingListRepository.delete(id);
  }

  // ─── Item Operations ──────────────────────────────────────

  /**
   * Get all items in a shopping list
   */
  async getListItems(listId: string): Promise<ApiResponse<ShoppingItem[]>> {
    return await shoppingItemRepository.findByListId(listId);
  }

  /**
   * Add an item to a shopping list
   */
  async addItem(data: CreateShoppingItemDto): Promise<ApiResponse<ShoppingItem>> {
    return await shoppingItemRepository.create(data);
  }

  /**
   * Update a shopping item
   */
  async updateItem(id: string, data: UpdateShoppingItemDto): Promise<ApiResponse<ShoppingItem>> {
    return await shoppingItemRepository.update(id, data);
  }

  /**
   * Toggle the purchased status of an item
   */
  async togglePurchased(
    id: string,
    purchasedBy: string | null,
  ): Promise<ApiResponse<ShoppingItem>> {
    const itemResponse = await shoppingItemRepository.findById(id);
    if (itemResponse.error || !itemResponse.data) {
      return itemResponse;
    }

    const isPurchased = !itemResponse.data.is_purchased;
    return await shoppingItemRepository.update(id, {
      is_purchased: isPurchased,
      purchased_by: isPurchased ? purchasedBy : null,
    });
  }

  /**
   * Delete a shopping item
   */
  async deleteItem(id: string): Promise<ApiResponse<void>> {
    return await shoppingItemRepository.delete(id);
  }
}

// Singleton instance
export const shoppingService = new ShoppingService();
