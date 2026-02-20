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
   * Find shopping lists by household ID
   */
  async findByHouseholdId(householdId: string): Promise<ApiResponse<ShoppingList[]>> {
    return this.findAll((builder) =>
      builder.eq('household_id', householdId).order('created_at', { ascending: false }),
    );
  }

  async create(dto: CreateShoppingListDto): Promise<ApiResponse<ShoppingList>> {
    const userIdResponse = await this.getAuthenticatedUserId();
    if (userIdResponse.error || !userIdResponse.data) {
      return { data: null, error: userIdResponse.error };
    }
    const userId = userIdResponse.data;

    return await this.execute(async () => {
      return await supabase
        .from('shopping_lists')
        .insert({
          ...dto,
          created_by: userId,
        })
        .select()
        .single();
    });
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

  async create(dto: CreateShoppingItemDto): Promise<ApiResponse<ShoppingItem>> {
    const userIdResponse = await this.getAuthenticatedUserId();
    if (userIdResponse.error || !userIdResponse.data) {
      return { data: null, error: userIdResponse.error };
    }
    const userId = userIdResponse.data;

    return await this.execute(async () => {
      return await supabase
        .from('shopping_items')
        .insert({
          ...dto,
          added_by: userId,
        })
        .select()
        .single();
    });
  }
}
