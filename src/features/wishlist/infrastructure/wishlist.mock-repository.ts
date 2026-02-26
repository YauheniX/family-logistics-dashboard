/**
 * Mock wishlist repositories for frontend-only mode
 */

import { MockRepository } from '../../shared/infrastructure/mock.repository';
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

export class MockWishlistRepository extends MockRepository<
  Wishlist,
  CreateWishlistDto,
  UpdateWishlistDto
> {
  constructor() {
    super('mock_wishlists');
  }

  /**
   * Find wishlists by user ID
   */
  async findByUserId(userId: string): Promise<ApiResponse<Wishlist[]>> {
    try {
      const wishlists = await this.loadAll();
      const filtered = wishlists
        .filter((w) => w.user_id === userId)
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
          message: error instanceof Error ? error.message : 'Failed to fetch wishlists',
        },
      };
    }
  }

  /**
   * Find a wishlist by its share slug (public access)
   */
  async findBySlug(slug: string): Promise<ApiResponse<Wishlist>> {
    try {
      const wishlists = await this.loadAll();
      const wishlist = wishlists.find(
        (w) => w.share_slug === slug && (w.visibility === 'public' || w.is_public),
      );

      if (!wishlist) {
        return {
          data: null,
          error: { message: 'Wishlist not found' },
        };
      }

      return { data: wishlist, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch wishlist',
        },
      };
    }
  }

  /**
   * Find wishlists shared by household members (visibility = 'household' or 'public')
   * Excludes the current user's own wishlists
   */
  async findByHouseholdId(
    householdId: string,
    excludeUserId: string,
  ): Promise<ApiResponse<Wishlist[]>> {
    try {
      const wishlists = await this.loadAll();
      const filtered = wishlists
        .filter(
          (w) =>
            w.household_id === householdId &&
            w.user_id !== excludeUserId &&
            (w.visibility === 'household' || w.visibility === 'public'),
        )
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
          message: error instanceof Error ? error.message : 'Failed to fetch household wishlists',
        },
      };
    }
  }
}

export class MockWishlistItemRepository extends MockRepository<
  WishlistItem,
  CreateWishlistItemDto,
  UpdateWishlistItemDto
> {
  constructor() {
    super('mock_wishlist_items');
  }

  /**
   * Find items by wishlist ID
   */
  async findByWishlistId(wishlistId: string): Promise<ApiResponse<WishlistItem[]>> {
    try {
      const items = await this.loadAll();
      const filtered = items
        .filter((i) => i.wishlist_id === wishlistId)
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
          message: error instanceof Error ? error.message : 'Failed to fetch wishlist items',
        },
      };
    }
  }

  /**
   * Reserve or unreserve an item (public access)
   */
  async reserveItem(
    id: string,
    dto: ReserveWishlistItemDto,
  ): Promise<ApiResponse<WishlistItem & { reservation_code?: string }>> {
    try {
      const data = await this.loadAll();
      const index = data.findIndex((record) => record.id === id);

      if (index === -1) {
        return {
          data: null,
          error: { message: `Record with id ${id} not found` },
        };
      }

      const currentItem = data[index];

      // Validate reservation code when unreserving
      if (!dto.is_reserved && currentItem.reservation_code) {
        if (!dto.reservation_code || dto.reservation_code !== currentItem.reservation_code) {
          return {
            data: null,
            error: { message: 'Invalid reservation code' },
          };
        }
      }

      // Generate code when reserving
      const generatedCode: string | null = dto.is_reserved
        ? String(Math.floor(Math.random() * 10000)).padStart(4, '0')
        : null;

      const updated: WishlistItem = {
        ...data[index],
        ...dto,
        reservation_code: generatedCode,
      };

      data[index] = updated;
      await this.saveAll(data);

      // Return with reservation_code available
      return {
        data: {
          ...updated,
          reservation_code: generatedCode || updated.reservation_code,
        } as WishlistItem & { reservation_code?: string },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to reserve item',
        },
      };
    }
  }
}
