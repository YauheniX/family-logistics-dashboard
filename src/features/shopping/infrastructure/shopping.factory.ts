/**
 * Repository factory - creates appropriate repository based on backend mode
 */

import { isMockMode } from '@/config/backend.config';

// Real repositories
import { ShoppingListRepository, ShoppingItemRepository } from './shopping.repository';

// Mock repositories
import { MockShoppingListRepository, MockShoppingItemRepository } from './shopping.mock-repository';

/**
 * Get shopping list repository (real or mock based on config)
 */
export function getShoppingListRepository() {
  return isMockMode() ? new MockShoppingListRepository() : new ShoppingListRepository();
}

/**
 * Get shopping item repository (real or mock based on config)
 */
export function getShoppingItemRepository() {
  return isMockMode() ? new MockShoppingItemRepository() : new ShoppingItemRepository();
}

// Singleton instances (will be real or mock based on mode)
export const shoppingListRepository = getShoppingListRepository();
export const shoppingItemRepository = getShoppingItemRepository();
