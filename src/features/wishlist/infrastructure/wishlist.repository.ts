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

  /**
   * Find a wishlist by its share slug (public access, no auth required)
   */
  async findBySlug(slug: string): Promise<ApiResponse<Wishlist>> {
    return this.query(async () => {
      return await this.supabase
        .from(this.tableName)
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
   */
  async reserveItem(id: string, dto: ReserveWishlistItemDto): Promise<ApiResponse<WishlistItem>> {
    return this.query(async () => {
      return await this.supabase
        .from(this.tableName)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(dto as any)
        .eq('id', id)
        .select()
        .single();
    });
  }
}
