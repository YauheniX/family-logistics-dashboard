/**
 * Mock shopping repositories for frontend-only mode
 */

import { MockRepository } from '../../shared/infrastructure/mock.repository';
import type {
  ShoppingList,
  CreateShoppingListDto,
  UpdateShoppingListDto,
  ShoppingItem,
  CreateShoppingItemDto,
  UpdateShoppingItemDto,
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

export class MockShoppingListRepository extends MockRepository<
  ShoppingList,
  CreateShoppingListDto,
  UpdateShoppingListDto
> {
  constructor() {
    super('mock_shopping_lists');
  }

  /**
   * Find shopping lists by family ID
   */
  async findByFamilyId(familyId: string): Promise<ApiResponse<ShoppingList[]>> {
    try {
      const lists = await this.loadAll();
      const filtered = lists
        .filter((l) => l.family_id === familyId)
        .sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
      return { data: filtered, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch shopping lists',
        },
      };
    }
  }
}

export class MockShoppingItemRepository extends MockRepository<
  ShoppingItem,
  CreateShoppingItemDto,
  UpdateShoppingItemDto
> {
  constructor() {
    super('mock_shopping_items');
  }

  /**
   * Find items by list ID
   */
  async findByListId(listId: string): Promise<ApiResponse<ShoppingItem[]>> {
    try {
      const items = await this.loadAll();
      const filtered = items
        .filter((i) => i.list_id === listId)
        .sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateA - dateB;
        });
      return { data: filtered, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch shopping items',
        },
      };
    }
  }
}
