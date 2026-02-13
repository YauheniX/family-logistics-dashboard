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
    name: `${trip.name} (Copy)`,
    start_date: trip.start_date,
    end_date: trip.end_date,
    status: 'planning',
    created_by: trip.created_by,
  };
  return createTrip(clone);
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
