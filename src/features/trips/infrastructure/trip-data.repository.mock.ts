/**
 * Mock repository for trip-related data (packing, budget, timeline, documents)
 */

import { MockRepository } from '../../shared/infrastructure/mock.repository';
import type {
  PackingItem,
  CreatePackingItemDto,
  UpdatePackingItemDto,
  BudgetEntry,
  CreateBudgetEntryDto,
  UpdateBudgetEntryDto,
  TimelineEvent,
  CreateTimelineEventDto,
  UpdateTimelineEventDto,
  TripDocument,
  CreateDocumentDto,
  UpdateDocumentDto,
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

/**
 * Mock packing item repository
 */
export class MockPackingItemRepository extends MockRepository<
  PackingItem,
  CreatePackingItemDto,
  UpdatePackingItemDto
> {
  constructor() {
    super('packing_items');
  }

  async findByTripId(tripId: string): Promise<ApiResponse<PackingItem[]>> {
    try {
      const items = await this.loadAll();
      const filtered = items.filter((item) => item.trip_id === tripId);
      return { data: filtered, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch packing items',
        },
      };
    }
  }

  async togglePacked(id: string, isPacked: boolean): Promise<ApiResponse<void>> {
    try {
      const items = await this.loadAll();
      const item = items.find((i) => i.id === id);
      if (!item) {
        return {
          data: null,
          error: { message: `Packing item with id ${id} not found` },
        };
      }
      await this.update(id, { is_packed: isPacked });
      return { data: undefined as void, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to toggle packing item',
        },
      };
    }
  }
}

/**
 * Mock budget entry repository
 */
export class MockBudgetEntryRepository extends MockRepository<
  BudgetEntry,
  CreateBudgetEntryDto,
  UpdateBudgetEntryDto
> {
  constructor() {
    super('budget_entries');
  }

  async findByTripId(tripId: string): Promise<ApiResponse<BudgetEntry[]>> {
    try {
      const entries = await this.loadAll();
      const filtered = entries.filter((entry) => entry.trip_id === tripId);
      return { data: filtered, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch budget entries',
        },
      };
    }
  }
}

/**
 * Mock timeline event repository
 */
export class MockTimelineEventRepository extends MockRepository<
  TimelineEvent,
  CreateTimelineEventDto,
  UpdateTimelineEventDto
> {
  constructor() {
    super('timeline_events');
  }

  async findByTripId(tripId: string): Promise<ApiResponse<TimelineEvent[]>> {
    try {
      const events = await this.loadAll();
      const filtered = events
        .filter((event) => event.trip_id === tripId)
        .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
      return { data: filtered, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch timeline events',
        },
      };
    }
  }
}

/**
 * Mock document repository
 */
export class MockDocumentRepository extends MockRepository<
  TripDocument,
  CreateDocumentDto,
  UpdateDocumentDto
> {
  constructor() {
    super('documents');
  }

  async findByTripId(tripId: string): Promise<ApiResponse<TripDocument[]>> {
    try {
      const documents = await this.loadAll();
      const filtered = documents.filter((doc) => doc.trip_id === tripId);
      return { data: filtered, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch documents',
        },
      };
    }
  }
}
