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
      const wishlist = wishlists.find((w) => w.share_slug === slug && w.is_public);

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

      // Generate code when reserving
      let generatedCode: string | undefined;
      if (dto.is_reserved) {
        generatedCode = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      }

      const updated = {
        ...data[index],
        ...dto,
        reservation_code: dto.is_reserved ? generatedCode : null,
        updated_at: new Date().toISOString(),
      };

      data[index] = updated;
      await this.saveAll(data);

      return {
        data: {
          ...updated,
          reservation_code: generatedCode, // Return code when reserving
        },
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
