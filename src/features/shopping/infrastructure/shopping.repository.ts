import { BaseRepository } from '../../shared/infrastructure/base.repository';
import { supabase } from '../../shared/infrastructure/supabase.client';
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
 * Shopping list repository - handles shopping list data operations via Supabase
 */
export class ShoppingListRepository extends BaseRepository<
  ShoppingList,
  CreateShoppingListDto,
  UpdateShoppingListDto
> {
  constructor() {
    super(supabase, 'shopping_lists');
  }

  /**
   * Find shopping lists by family ID
   */
  async findByFamilyId(familyId: string): Promise<ApiResponse<ShoppingList[]>> {
    return this.findAll((builder) =>
      builder.eq('family_id', familyId).order('created_at', { ascending: false }),
    );
  }
}

/**
 * Shopping item repository - handles shopping item data operations via Supabase
 */
export class ShoppingItemRepository extends BaseRepository<
  ShoppingItem,
  CreateShoppingItemDto,
  UpdateShoppingItemDto
> {
  constructor() {
    super(supabase, 'shopping_items');
  }

  /**
   * Find items by list ID
   */
  async findByListId(listId: string): Promise<ApiResponse<ShoppingItem[]>> {
    return this.findAll((builder) =>
      builder.eq('list_id', listId).order('created_at', { ascending: true }),
    );
  }
}
