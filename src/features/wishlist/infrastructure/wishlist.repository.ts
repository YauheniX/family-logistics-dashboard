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
 * Add computed is_public property based on visibility for frontend compatibility
 */
function addIsPublic<T extends { visibility?: string }>(wishlist: T): T & { is_public: boolean } {
  return {
    ...wishlist,
    is_public: wishlist.visibility === 'public',
  };
}

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
    const result = await this.findAll((builder) =>
      builder.eq('user_id', userId).order('created_at', { ascending: false }),
    );
    // Add is_public computed property for frontend compatibility
    if (result.data) {
      return { ...result, data: result.data.map(addIsPublic) };
    }
    return result;
  }

  async create(dto: CreateWishlistDto & { share_slug: string }): Promise<ApiResponse<Wishlist>> {
    const userIdResponse = await this.getAuthenticatedUserId();
    if (userIdResponse.error || !userIdResponse.data) {
      return { data: null, error: userIdResponse.error };
    }
    const userId = userIdResponse.data;

    // Get member_id and household_id from user's member record
    // If dto already provides these, use them; otherwise query for them
    let memberId = dto.member_id;
    let householdId = dto.household_id;

    if (!memberId || !householdId) {
      // Query members table directly (not through this.execute since it's not in the typed schema)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: memberData, error: memberError } = await (supabase as any)
        .from('members')
        .select('id, household_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (memberError || !memberData) {
        return {
          data: null,
          error: {
            message: 'User must belong to a household to create wishlists',
            code: memberError?.code,
            details: memberError?.details,
          },
        };
      }

      memberId = memberData.id;
      householdId = memberData.household_id;
    }

    // Map visibility from legacy is_public to new visibility enum
    const visibility = dto.visibility || (dto.is_public ? 'public' : 'private');

    return await this.execute(async () => {
      return await supabase
        .from('wishlists')
        .insert({
          ...dto,
          user_id: userId,
          member_id: memberId,
          household_id: householdId,
          visibility,
        })
        .select()
        .single();
    });
  }

  /**
   * Find a wishlist by its share slug (public access, no auth required)
   */
  async findBySlug(slug: string): Promise<ApiResponse<Wishlist>> {
    const result = await this.query(async () => {
      return await this.supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(this.tableName as any)
        .select('*')
        .eq('share_slug', slug)
        .eq('visibility', 'public')
        .single();
    });

    // Add is_public computed property for frontend compatibility
    if (result.data) {
      return { data: addIsPublic(result.data), error: null };
    }
    return { data: null, error: result.error };
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
        p_email: dto.reserved_by_email || null,
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
      if (!itemResponse.data) throw new Error('Item not found');

      // Extract reservation code from RPC jsonb response (if present)
      let codeFromRpc: string | undefined;
      if (
        rpcData !== null &&
        rpcData !== undefined &&
        typeof rpcData === 'object' &&
        'reservation_code' in rpcData
      ) {
        const code = (rpcData as Record<string, unknown>).reservation_code;
        codeFromRpc = code ? String(code) : undefined;
      }

      const item = itemResponse.data as unknown as WishlistItem;
      // Return the item with reservation_code property available
      return {
        data: {
          ...item,
          reservation_code: codeFromRpc || item.reservation_code,
        } as WishlistItem & { reservation_code?: string },
        error: null,
      };
    });
  }
}
