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

// Type for Supabase query result with nested member data (matches database nullability before transformation)
type WishlistWithMember = {
  id: string;
  user_id: string;
  member_id: string | null;
  household_id: string | null;
  title: string;
  description: string | null;
  visibility: 'public' | 'private' | 'household';
  share_slug: string;
  created_at: string;
  updated_at: string | null;
  member?: {
    display_name: string | null;
    role: string;
  } | null;
};

/**
 * Transform Supabase query result with nested member to normalized wishlist format.
 * Converts nullable fields to undefined and extracts member_name from nested member.
 */
function transformWishlistWithMember(w: WishlistWithMember) {
  return {
    ...w,
    member_id: w.member_id ?? undefined,
    household_id: w.household_id ?? undefined,
    updated_at: w.updated_at ?? undefined,
    member_name: w.member?.display_name ?? undefined,
    member: undefined, // Remove nested object
  };
}

/**
 * Add computed is_public property based on visibility for frontend display compatibility.
 */
function addIsPublic<T extends { visibility?: string | null }>(
  wishlist: T,
): T & { is_public: boolean } {
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

  /**
   * Find wishlists by user ID and household ID
   * Returns only personal wishlists (excludes children's wishlists)
   */
  async findByUserIdAndHouseholdId(
    userId: string,
    householdId: string,
  ): Promise<ApiResponse<Wishlist[]>> {
    const result = await this.query(async () => {
      return await supabase
        .from('wishlists')
        .select(
          `
          *,
          member:members(display_name, role)
        `,
        )
        .eq('user_id', userId)
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });
    });

    // Filter OUT children's wishlists (they're shown in separate section)
    if (result.data) {
      const personalWishlists = (result.data as unknown as WishlistWithMember[])
        .filter((w) => w.member?.role !== 'child')
        .map((w) => addIsPublic(transformWishlistWithMember(w)));
      return { ...result, data: personalWishlists };
    }
    return { data: null, error: result.error };
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

    // If household_id provided but no member_id, find current user's member in that household
    if (householdId && !memberId) {
      // Query members table directly (not through this.execute since it's not in the typed schema)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: memberData, error: memberError } = await (supabase as any)
        .from('members')
        .select('id')
        .eq('user_id', userId)
        .eq('household_id', householdId)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError || !memberData) {
        return {
          data: null,
          error: {
            message: 'User must belong to this household to create wishlists',
            code: memberError?.code,
            details: memberError?.details,
          },
        };
      }

      memberId = memberData.id;
    } else if (!memberId || !householdId) {
      // No household_id provided, get first active membership
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

    // Use visibility, default to 'private' if not provided
    const visibility = dto.visibility ?? 'private';

    const result = await this.execute(async () => {
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

    // Add is_public computed property for frontend compatibility
    if (result.data) {
      return { data: addIsPublic(result.data), error: null };
    }
    return { data: null, error: result.error };
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

  /**
   * Find a wishlist by ID (overrides base to add is_public)
   */
  async findById(id: string): Promise<ApiResponse<Wishlist>> {
    const result = await super.findById(id);
    // Add is_public computed property for frontend compatibility
    if (result.data) {
      return { data: addIsPublic(result.data), error: null };
    }
    return result;
  }

  /**
   * Update a wishlist (overrides base to add is_public)
   */
  async update(id: string, dto: UpdateWishlistDto): Promise<ApiResponse<Wishlist>> {
    const result = await super.update(id, dto);
    // Add is_public computed property for frontend compatibility
    if (result.data) {
      return { data: addIsPublic(result.data), error: null };
    }
    return result;
  }

  /**
   * Find wishlists shared by household members.
   *
   * Retrieves wishlists that belong to the specified household and are visible
   * to other household members (visibility = 'household' or 'public').
   * The current user's own PERSONAL wishlists are excluded, but children's wishlists
   * with household/public visibility ARE included (even if created by current user).
   *
   * @param householdId - The UUID of the household to search within
   * @param excludeUserId - The UUID of the current user
   * @returns Promise containing an array of visible wishlists ordered by creation date (newest first)
   */
  async findByHouseholdId(
    householdId: string,
    excludeUserId: string,
  ): Promise<ApiResponse<Wishlist[]>> {
    // First, get the current user's member_id in this household
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: memberData, error: memberError } = await (supabase as any)
      .from('members')
      .select('id')
      .eq('user_id', excludeUserId)
      .eq('household_id', householdId)
      .eq('is_active', true)
      .maybeSingle();

    if (memberError) {
      return {
        data: null,
        error: {
          message: 'Failed to get user member',
          code: memberError.code,
          details: memberError.details,
        },
      };
    }

    const currentUserMemberId = memberData?.id;

    // Get wishlists with member info to properly filter
    const result = await this.query(async () => {
      return await supabase
        .from('wishlists')
        .select(
          `
          *,
          member:members(id, display_name, role)
        `,
        )
        .eq('household_id', householdId)
        .in('visibility', ['household', 'public'])
        .order('created_at', { ascending: false });
    });

    // Filter: exclude current user's PERSONAL wishlists (where member_id = current user's member)
    // but INCLUDE children's wishlists (even if user_id = current user)
    if (result.data && currentUserMemberId) {
      const filteredWishlists = (result.data as unknown as WishlistWithMember[])
        .filter((w) => w.member_id !== currentUserMemberId) // Exclude user's own wishlists
        .map((w) => addIsPublic(transformWishlistWithMember(w)));
      return { ...result, data: filteredWishlists };
    } else if (result.data && !currentUserMemberId) {
      // User not in household, return all shared wishlists
      const allWishlists = (result.data as unknown as WishlistWithMember[]).map((w) =>
        addIsPublic(transformWishlistWithMember(w)),
      );
      return { ...result, data: allWishlists };
    }
    return { data: null, error: result.error };
  }

  /**
   * Find wishlists created by parent for their children.
   *
   * Retrieves wishlists where the current user is the creator (user_id)
   * but the member_id points to a child member in the household.
   *
   * @param userId - The UUID of the parent user
   * @param householdId - The UUID of the household
   * @returns Promise containing an array of children's wishlists ordered by creation date (newest first)
   */
  async findChildrenWishlists(
    userId: string,
    householdId: string,
  ): Promise<ApiResponse<Wishlist[]>> {
    const result = await this.query(async () => {
      return await supabase
        .from('wishlists')
        .select(
          `
          *,
          member:members(id, display_name, role)
        `,
        )
        .eq('user_id', userId)
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });
    });

    // Filter for wishlists where member is a child and transform data
    if (result.data) {
      const childWishlists = (result.data as unknown as WishlistWithMember[])
        .filter((w) => w.member?.role === 'child')
        .map((w) => addIsPublic(transformWishlistWithMember(w)));
      return { ...result, data: childWishlists };
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
   * Requires email for both reserving and unreserving (owner can unreserve without email)
   */
  async reserveItem(id: string, dto: ReserveWishlistItemDto): Promise<ApiResponse<WishlistItem>> {
    return this.query(async () => {
      // Call the RPC function to update reservation
      const { data: rpcData, error: rpcError } = await this.supabase.rpc('reserve_wishlist_item', {
        p_item_id: id,
        p_reserved: dto.is_reserved,
        p_email: dto.reserved_by_email || null,
        p_name: dto.reserved_by_name || null,
        p_code: null, // Backward compatibility parameter, ignored by function
      });

      if (rpcError) throw rpcError;

      // Check if the operation failed (e.g., already reserved)
      if (
        rpcData &&
        typeof rpcData === 'object' &&
        'success' in rpcData &&
        rpcData.success === false
      ) {
        throw new Error((rpcData as { error?: string }).error || 'Reservation failed');
      }

      // Fetch and return the updated item
      const itemResponse = await this.supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(this.tableName as any)
        .select()
        .eq('id', id)
        .single();

      if (itemResponse.error) throw itemResponse.error;
      if (!itemResponse.data) throw new Error('Item not found');

      const item = itemResponse.data as unknown as WishlistItem;
      return {
        data: item,
        error: null,
      };
    });
  }
}
