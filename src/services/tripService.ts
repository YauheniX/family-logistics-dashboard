import { supabase } from './supabaseClient';
import type { BudgetEntry, NewTripPayload, PackingItem, TimelineEvent, Trip, TripDocument } from '@/types/entities';

export async function fetchTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('created_by', userId)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchTrip(id: string): Promise<Trip | null> {
  const { data, error } = await supabase.from('trips').select('*').eq('id', id).single();
  if (error) throw error;
  return data ?? null;
}

export async function createTrip(payload: NewTripPayload): Promise<Trip | null> {
  const { data, error } = await supabase.from('trips').insert(payload).select().single();
  if (error) throw error;
  return data ?? null;
}

export async function updateTrip(id: string, payload: Partial<NewTripPayload>): Promise<Trip | null> {
  const { data, error } = await supabase.from('trips').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data ?? null;
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw error;
}

export async function duplicateTrip(trip: Trip): Promise<Trip | null> {
  const clone: NewTripPayload = {
    name: `Copy of ${trip.name}`,
    start_date: trip.start_date,
    end_date: trip.end_date,
    status: 'planning',
    created_by: trip.created_by,
  };
  const duplicatedTrip = await createTrip(clone);
  if (!duplicatedTrip) return null;

  try {
    const [packingItems, budgetEntries, timelineEvents] = await Promise.all([
      fetchPackingItems(trip.id),
      fetchBudgetEntries(trip.id),
      fetchTimelineEvents(trip.id),
    ]);

    if (packingItems.length) {
      const packingPayload = packingItems.map((item) => ({
        trip_id: duplicatedTrip.id,
        title: item.title,
        category: item.category,
        is_packed: item.is_packed,
      }));
      const { error } = await supabase.from('packing_items').insert(packingPayload);
      if (error) throw error;
    }

    if (budgetEntries.length) {
      const budgetPayload = budgetEntries.map((entry) => ({
        trip_id: duplicatedTrip.id,
        category: entry.category,
        amount: entry.amount,
        currency: entry.currency,
      }));
      const { error } = await supabase.from('budget_entries').insert(budgetPayload);
      if (error) throw error;
    }

    if (timelineEvents.length) {
      const timelinePayload = timelineEvents.map((event) => ({
        trip_id: duplicatedTrip.id,
        title: event.title,
        date_time: event.date_time,
        notes: event.notes,
      }));
      const { error } = await supabase.from('timeline_events').insert(timelinePayload);
      if (error) throw error;
    }

    return duplicatedTrip;
  } catch (error) {
    try {
      await deleteTrip(duplicatedTrip.id);
    } catch (_cleanupError) {
      // keep original error
    }
    throw error;
  }
}

export async function fetchPackingItems(tripId: string): Promise<PackingItem[]> {
  const { data, error } = await supabase
    .from('packing_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('title');
  if (error) throw error;
  return data ?? [];
}

export async function upsertPackingItem(item: Partial<PackingItem> & { trip_id: string }): Promise<PackingItem | null> {
  const { data, error } = await supabase.from('packing_items').upsert(item).select().single();
  if (error) throw error;
  return data ?? null;
}

export async function togglePacked(id: string, isPacked: boolean): Promise<void> {
  const { error } = await supabase.from('packing_items').update({ is_packed: isPacked }).eq('id', id);
  if (error) throw error;
}

export async function fetchDocuments(tripId: string): Promise<TripDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addDocument(doc: Omit<TripDocument, 'id'>): Promise<TripDocument | null> {
  const { data, error } = await supabase.from('documents').insert(doc).select().single();
  if (error) throw error;
  return data ?? null;
}

export async function fetchBudgetEntries(tripId: string): Promise<BudgetEntry[]> {
  const { data, error } = await supabase
    .from('budget_entries')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addBudgetEntry(entry: Omit<BudgetEntry, 'id'>): Promise<BudgetEntry | null> {
  const { data, error } = await supabase.from('budget_entries').insert(entry).select().single();
  if (error) throw error;
  return data ?? null;
}

export async function fetchTimelineEvents(tripId: string): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('trip_id', tripId)
    .order('date_time');
  if (error) throw error;
  return data ?? [];
}

export async function addTimelineEvent(event: Omit<TimelineEvent, 'id'>): Promise<TimelineEvent | null> {
  const { data, error } = await supabase.from('timeline_events').insert(event).select().single();
  if (error) throw error;
  return data ?? null;
}
