/**
 * Repository factory - creates appropriate repository based on backend mode
 */

import { isMockMode } from '@/config/backend.config';

// Real repositories
import { TripRepository } from '../infrastructure/trip.repository';
import { TripMemberRepository } from '../infrastructure/trip-member.repository';
import {
  PackingItemRepository,
  BudgetEntryRepository,
  TimelineEventRepository,
  DocumentRepository,
} from '../infrastructure/trip-data.repository';

// Mock repositories
import { MockTripRepository } from '../infrastructure/trip.repository.mock';
import { MockTripMemberRepository } from '../infrastructure/trip-member.repository.mock';
import {
  MockPackingItemRepository,
  MockBudgetEntryRepository,
  MockTimelineEventRepository,
  MockDocumentRepository,
} from '../infrastructure/trip-data.repository.mock';

/**
 * Get trip repository (real or mock based on config)
 */
export function getTripRepository() {
  return isMockMode() ? new MockTripRepository() : new TripRepository();
}

/**
 * Get trip member repository (real or mock based on config)
 */
export function getTripMemberRepository() {
  return isMockMode() ? new MockTripMemberRepository() : new TripMemberRepository();
}

/**
 * Get packing item repository (real or mock based on config)
 */
export function getPackingItemRepository() {
  return isMockMode() ? new MockPackingItemRepository() : new PackingItemRepository();
}

/**
 * Get budget entry repository (real or mock based on config)
 */
export function getBudgetEntryRepository() {
  return isMockMode() ? new MockBudgetEntryRepository() : new BudgetEntryRepository();
}

/**
 * Get timeline event repository (real or mock based on config)
 */
export function getTimelineEventRepository() {
  return isMockMode() ? new MockTimelineEventRepository() : new TimelineEventRepository();
}

/**
 * Get document repository (real or mock based on config)
 */
export function getDocumentRepository() {
  return isMockMode() ? new MockDocumentRepository() : new DocumentRepository();
}

// Singleton instances (will be real or mock based on mode)
export const tripRepository = getTripRepository();
export const tripMemberRepository = getTripMemberRepository();
export const packingItemRepository = getPackingItemRepository();
export const budgetEntryRepository = getBudgetEntryRepository();
export const timelineEventRepository = getTimelineEventRepository();
export const documentRepository = getDocumentRepository();
