/**
 * Template repository factory - creates appropriate repository based on backend mode
 */

import { isMockMode } from '@/config/backend.config';

// Real repositories
import {
  PackingTemplateRepository,
  PackingTemplateItemRepository,
} from '../infrastructure/template.repository';

// Mock repositories
import {
  MockPackingTemplateRepository,
  MockPackingTemplateItemRepository,
} from '../infrastructure/template.repository.mock';

/**
 * Get packing template repository (real or mock based on config)
 */
export function getPackingTemplateRepository() {
  return isMockMode() ? new MockPackingTemplateRepository() : new PackingTemplateRepository();
}

/**
 * Get packing template item repository (real or mock based on config)
 */
export function getPackingTemplateItemRepository() {
  return isMockMode()
    ? new MockPackingTemplateItemRepository()
    : new PackingTemplateItemRepository();
}

// Singleton instances (will be real or mock based on mode)
export const packingTemplateRepository = getPackingTemplateRepository();
export const packingTemplateItemRepository = getPackingTemplateItemRepository();
