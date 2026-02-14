import { BaseRepository } from '../../shared/infrastructure/base.repository';
import { supabase } from '../../shared/infrastructure/supabase.client';
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
 * Packing items repository
 */
export class PackingItemRepository extends BaseRepository<
  PackingItem,
  CreatePackingItemDto,
  UpdatePackingItemDto
> {
  constructor() {
    super(supabase, 'packing_items');
  }

  async findByTripId(tripId: string): Promise<ApiResponse<PackingItem[]>> {
    return this.findAll((builder) => builder.eq('trip_id', tripId).order('title'));
  }

  async togglePacked(id: string, isPacked: boolean): Promise<ApiResponse<void>> {
    return this.execute(async () => {
      const { error } = await supabase
        .from('packing_items')
        .update({ is_packed: isPacked })
        .eq('id', id);
      return { data: null as any, error };
    });
  }
}

/**
 * Budget entries repository
 */
export class BudgetEntryRepository extends BaseRepository<
  BudgetEntry,
  CreateBudgetEntryDto,
  UpdateBudgetEntryDto
> {
  constructor() {
    super(supabase, 'budget_entries');
  }

  async findByTripId(tripId: string): Promise<ApiResponse<BudgetEntry[]>> {
    return this.findAll((builder) =>
      builder.eq('trip_id', tripId).order('created_at', { ascending: false }),
    );
  }
}

/**
 * Timeline events repository
 */
export class TimelineEventRepository extends BaseRepository<
  TimelineEvent,
  CreateTimelineEventDto,
  UpdateTimelineEventDto
> {
  constructor() {
    super(supabase, 'timeline_events');
  }

  async findByTripId(tripId: string): Promise<ApiResponse<TimelineEvent[]>> {
    return this.findAll((builder) => builder.eq('trip_id', tripId).order('date_time'));
  }
}

/**
 * Documents repository
 */
export class DocumentRepository extends BaseRepository<
  TripDocument,
  CreateDocumentDto,
  UpdateDocumentDto
> {
  constructor() {
    super(supabase, 'documents');
  }

  async findByTripId(tripId: string): Promise<ApiResponse<TripDocument[]>> {
    return this.findAll((builder) =>
      builder.eq('trip_id', tripId).order('created_at', { ascending: false }),
    );
  }
}

// Singleton instances
export const packingItemRepository = new PackingItemRepository();
export const budgetEntryRepository = new BudgetEntryRepository();
export const timelineEventRepository = new TimelineEventRepository();
export const documentRepository = new DocumentRepository();
