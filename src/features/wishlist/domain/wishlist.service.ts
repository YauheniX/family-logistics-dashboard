import { wishlistRepository, wishlistItemRepository } from '../infrastructure/wishlist.factory';
import type {
  Wishlist,
  CreateWishlistDto,
  UpdateWishlistDto,
  WishlistItem,
  CreateWishlistItemDto,
  UpdateWishlistItemDto,
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

/**
 * Generate a random share slug (8 chars, alphanumeric lowercase)
 */
function generateShareSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

/**
 * Wishlist service - contains business logic for wishlists and items
 */
export class WishlistService {
  // ─── Wishlist Operations ──────────────────────────────────

  /**
   * Get all wishlists for the current user
   */
  async getUserWishlists(userId: string): Promise<ApiResponse<Wishlist[]>> {
    return await wishlistRepository.findByUserId(userId);
  }

  /**
   * Get a single wishlist by ID
   */
  async getWishlist(id: string): Promise<ApiResponse<Wishlist>> {
    return await wishlistRepository.findById(id);
  }

  /**
   * Get a wishlist by its share slug (public access, no auth required)
   */
  async getWishlistBySlug(slug: string): Promise<ApiResponse<Wishlist>> {
    return await wishlistRepository.findBySlug(slug);
  }

  /**
   * Create a new wishlist with an auto-generated share slug
   */
  async createWishlist(data: CreateWishlistDto): Promise<ApiResponse<Wishlist>> {
    const dataWithSlug = {
      ...data,
      share_slug: generateShareSlug(),
    };
    return await wishlistRepository.create(dataWithSlug);
  }

  /**
   * Update a wishlist
   */
  async updateWishlist(id: string, data: UpdateWishlistDto): Promise<ApiResponse<Wishlist>> {
    return await wishlistRepository.update(id, data);
  }

  /**
   * Delete a wishlist
   */
  async deleteWishlist(id: string): Promise<ApiResponse<void>> {
    return await wishlistRepository.delete(id);
  }

  // ─── Item Operations ──────────────────────────────────────

  /**
   * Get all items in a wishlist
   */
  async getWishlistItems(wishlistId: string): Promise<ApiResponse<WishlistItem[]>> {
    return await wishlistItemRepository.findByWishlistId(wishlistId);
  }

  /**
   * Add an item to a wishlist
   */
  async addItem(data: CreateWishlistItemDto): Promise<ApiResponse<WishlistItem>> {
    return await wishlistItemRepository.create(data);
  }

  /**
   * Update a wishlist item
   */
  async updateItem(id: string, data: UpdateWishlistItemDto): Promise<ApiResponse<WishlistItem>> {
    return await wishlistItemRepository.update(id, data);
  }

  /**
   * Delete a wishlist item
   */
  async deleteItem(id: string): Promise<ApiResponse<void>> {
    return await wishlistItemRepository.delete(id);
  }

  /**
   * Toggle reservation on an item (public access, no auth required)
   */
  async reserveItem(id: string, email?: string): Promise<ApiResponse<WishlistItem>> {
    const itemResponse = await wishlistItemRepository.findById(id);
    if (itemResponse.error || !itemResponse.data) {
      return itemResponse;
    }

    const isReserved = !itemResponse.data.is_reserved;
    return await wishlistItemRepository.reserveItem(id, {
      is_reserved: isReserved,
      reserved_by_email: isReserved ? (email ?? null) : null,
    });
  }
}

// Singleton instance
export const wishlistService = new WishlistService();
