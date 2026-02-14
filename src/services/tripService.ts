import { SupabaseService } from './supabaseService';
import { supabase } from './supabaseClient';
import type {
  BudgetEntry,
  NewTripPayload,
  PackingItem,
  TimelineEvent,
  Trip,
  TripDocument,
} from '@/types/entities';
import type { ApiResponse } from '@/types/api';

export async function fetchTrips(userId: string): Promise<ApiResponse<Trip[]>> {
  // Fetch trips owned by the user
  const ownTripsResponse = await SupabaseService.select<Trip>('trips', (builder) =>
    builder.eq('created_by', userId).order('start_date', { ascending: true }),
  );

  if (ownTripsResponse.error) {
    return ownTripsResponse;
  }

  // Fetch trips shared with the user via trip_members
  const membershipsResponse = await SupabaseService.execute<{ trip_id: string }[]>(async () => {
    return await supabase.from('trip_members').select('trip_id').eq('user_id', userId);
  });

  if (membershipsResponse.error) {
    return { data: ownTripsResponse.data || [], error: null };
  }

  const sharedTripIds = (membershipsResponse.data ?? [])
    .map((m) => m.trip_id)
    .filter((id) => !(ownTripsResponse.data ?? []).some((t) => t.id === id));

  let sharedTrips: Trip[] = [];
  if (sharedTripIds.length) {
    const sharedResponse = await SupabaseService.select<Trip>('trips', (builder) =>
      builder.in('id', sharedTripIds).order('start_date', { ascending: true }),
    );

    if (!sharedResponse.error) {
      sharedTrips = sharedResponse.data ?? [];
    }
  }

  return {
    data: [...(ownTripsResponse.data ?? []), ...sharedTrips],
    error: null,
  };
}

export async function fetchTrip(id: string): Promise<ApiResponse<Trip>> {
  return SupabaseService.selectSingle<Trip>('trips', (builder) => builder.eq('id', id));
}

export async function createTrip(payload: NewTripPayload): Promise<ApiResponse<Trip>> {
  return SupabaseService.insert<Trip>('trips', payload);
}

export async function updateTrip(
  id: string,
  payload: Partial<NewTripPayload>,
): Promise<ApiResponse<Trip>> {
  return SupabaseService.update<Trip>('trips', id, payload);
}

export async function deleteTrip(id: string): Promise<ApiResponse<null>> {
  return SupabaseService.delete('trips', id);
}

export async function duplicateTrip(trip: Trip): Promise<ApiResponse<Trip>> {
  const clone: NewTripPayload = {
    name: `Copy of ${trip.name}`,
    start_date: trip.start_date,
    end_date: trip.end_date,
    status: 'planning',
    created_by: trip.created_by,
  };

  const duplicatedTripResponse = await createTrip(clone);
  if (duplicatedTripResponse.error || !duplicatedTripResponse.data) {
    return duplicatedTripResponse;
  }

  const duplicatedTrip = duplicatedTripResponse.data;

  try {
    const [packingResponse, budgetResponse, timelineResponse] = await Promise.all([
      fetchPackingItems(trip.id),
      fetchBudgetEntries(trip.id),
      fetchTimelineEvents(trip.id),
    ]);

    const packingItems = packingResponse.data ?? [];
    const budgetEntries = budgetResponse.data ?? [];
    const timelineEvents = timelineResponse.data ?? [];

    if (packingItems.length) {
      const packingPayload = packingItems.map((item) => ({
        trip_id: duplicatedTrip.id,
        title: item.title,
        category: item.category,
        is_packed: item.is_packed,
      }));
      await SupabaseService.insertMany<PackingItem>('packing_items', packingPayload);
    }

    if (budgetEntries.length) {
      const budgetPayload = budgetEntries.map((entry) => ({
        trip_id: duplicatedTrip.id,
        category: entry.category,
        amount: entry.amount,
        currency: entry.currency,
        is_planned: entry.is_planned,
      }));
      await SupabaseService.insertMany<BudgetEntry>('budget_entries', budgetPayload);
    }

    if (timelineEvents.length) {
      const timelinePayload = timelineEvents.map((event) => ({
        trip_id: duplicatedTrip.id,
        title: event.title,
        date_time: event.date_time,
        notes: event.notes,
      }));
      await SupabaseService.insertMany<TimelineEvent>('timeline_events', timelinePayload);
    }

    return { data: duplicatedTrip, error: null };
  } catch (error) {
    // Clean up the duplicated trip if copying failed
    await deleteTrip(duplicatedTrip.id);
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Failed to duplicate trip data',
        details: error,
      },
    };
  }
}

export async function fetchPackingItems(tripId: string): Promise<ApiResponse<PackingItem[]>> {
  return SupabaseService.select<PackingItem>('packing_items', (builder) =>
    builder.eq('trip_id', tripId).order('title'),
  );
}

export async function upsertPackingItem(
  item: Partial<PackingItem> & { trip_id: string },
): Promise<ApiResponse<PackingItem>> {
  return SupabaseService.upsert<PackingItem>('packing_items', item);
}

export async function togglePacked(id: string, isPacked: boolean): Promise<ApiResponse<null>> {
  return SupabaseService.execute(async () => {
    const { error } = await supabase
      .from('packing_items')
      .update({ is_packed: isPacked })
      .eq('id', id);
    return { data: null, error };
  });
}

export async function fetchDocuments(tripId: string): Promise<ApiResponse<TripDocument[]>> {
  return SupabaseService.select<TripDocument>('documents', (builder) =>
    builder.eq('trip_id', tripId).order('created_at', { ascending: false }),
  );
}

export async function addDocument(
  doc: Omit<TripDocument, 'id'>,
): Promise<ApiResponse<TripDocument>> {
  return SupabaseService.insert<TripDocument>('documents', doc);
}

export async function fetchBudgetEntries(tripId: string): Promise<ApiResponse<BudgetEntry[]>> {
  return SupabaseService.select<BudgetEntry>('budget_entries', (builder) =>
    builder.eq('trip_id', tripId).order('created_at', { ascending: false }),
  );
}

export async function addBudgetEntry(
  entry: Omit<BudgetEntry, 'id'>,
): Promise<ApiResponse<BudgetEntry>> {
  return SupabaseService.insert<BudgetEntry>('budget_entries', entry);
}

export async function fetchTimelineEvents(tripId: string): Promise<ApiResponse<TimelineEvent[]>> {
  return SupabaseService.select<TimelineEvent>('timeline_events', (builder) =>
    builder.eq('trip_id', tripId).order('date_time'),
  );
}

export async function addTimelineEvent(
  event: Omit<TimelineEvent, 'id'>,
): Promise<ApiResponse<TimelineEvent>> {
  return SupabaseService.insert<TimelineEvent>('timeline_events', event);
}
