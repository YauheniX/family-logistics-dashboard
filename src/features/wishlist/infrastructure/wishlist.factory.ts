/**
 * Repository factory - creates appropriate repository based on backend mode
 */

import { isMockMode } from '@/config/backend.config';

// Real repositories
import { WishlistRepository, WishlistItemRepository } from './wishlist.repository';

// Mock repositories
import { MockWishlistRepository, MockWishlistItemRepository } from './wishlist.mock-repository';

/**
 * Get wishlist repository (real or mock based on config)
 */
export function getWishlistRepository() {
  return isMockMode() ? new MockWishlistRepository() : new WishlistRepository();
}

/**
 * Get wishlist item repository (real or mock based on config)
 */
export function getWishlistItemRepository() {
  return isMockMode() ? new MockWishlistItemRepository() : new WishlistItemRepository();
}

// Singleton instances (will be real or mock based on mode)
export const wishlistRepository = getWishlistRepository();
export const wishlistItemRepository = getWishlistItemRepository();
