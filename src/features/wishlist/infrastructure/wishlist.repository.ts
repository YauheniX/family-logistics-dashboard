import { BaseRepository } from '../../shared/infrastructure/base.repository';
import { supabase } from '../../shared/infrastructure/supabase.client';
import type {
  Wishlist,
  CreateWishlistDto,
  UpdateWishlistDto,
  WishlistItem,
  CreateWishlistItemDto,
  UpdateWishlistItemDto,
  ReserveWishlistItemDto,
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

/**
 * Wishlist repository - handles wishlist data operations via Supabase
 */
export class WishlistRepository extends BaseRepository<
  Wishlist,
  CreateWishlistDto,
  UpdateWishlistDto
> {
  constructor() {
    super(supabase, 'wishlists');
  }

  /**
   * Find wishlists by user ID
   */
  async findByUserId(userId: string): Promise<ApiResponse<Wishlist[]>> {
    return this.findAll((builder) =>
      builder.eq('user_id', userId).order('created_at', { ascending: false }),
    );
  }

  async create(dto: CreateWishlistDto & { share_slug: string }): Promise<ApiResponse<Wishlist>> {
    const userIdResponse = await this.getAuthenticatedUserId();
    if (userIdResponse.error || !userIdResponse.data) {
      return { data: null, error: userIdResponse.error };
    }
    const userId = userIdResponse.data;

    return await this.execute(async () => {
      return await supabase
        .from('wishlists')
        .insert({
          ...dto,
          user_id: userId,
        })
        .select()
        .single();
    });
  }

  /**
   * Find a wishlist by its share slug (public access, no auth required)
   */
  async findBySlug(slug: string): Promise<ApiResponse<Wishlist>> {
    return this.query(async () => {
      return await this.supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(this.tableName as any)
        .select('*')
        .eq('share_slug', slug)
        .eq('is_public', true)
        .single();
    });
  }
}

/**
 * Wishlist item repository - handles wishlist item data operations via Supabase
 */
export class WishlistItemRepository extends BaseRepository<
  WishlistItem,
  CreateWishlistItemDto,
  UpdateWishlistItemDto
> {
  constructor() {
    super(supabase, 'wishlist_items');
  }

  /**
   * Find items by wishlist ID
   */
  async findByWishlistId(wishlistId: string): Promise<ApiResponse<WishlistItem[]>> {
    return this.findAll((builder) =>
      builder.eq('wishlist_id', wishlistId).order('created_at', { ascending: true }),
    );
  }

  /**
   * Reserve or unreserve an item (public access, no auth required)
   * Returns the item and reservation_code (when reserving)
   */
  async reserveItem(
    id: string,
    dto: ReserveWishlistItemDto,
  ): Promise<ApiResponse<WishlistItem & { reservation_code?: string }>> {
    return this.query(async () => {
      // Call the RPC function to update reservation
      const { data: rpcData, error: rpcError } = await this.supabase.rpc('reserve_wishlist_item', {
        p_item_id: id,
        p_reserved: dto.is_reserved,

        p_name: dto.reserved_by_name || null,
        p_code: dto.reservation_code || null,
      });

      if (rpcError) throw rpcError;

      // Fetch and return the updated item
      const itemResponse = await this.supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(this.tableName as any)
        .select()
        .eq('id', id)
        .single();

      if (itemResponse.error) throw itemResponse.error;

      // Return item with the reservation code from RPC response
      return {
        data: {
          ...itemResponse.data,
          reservation_code: rpcData?.reservation_code || undefined,
        },
        error: null,
      };
    });
  }
}
