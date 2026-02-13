export type TripStatus = 'planning' | 'booked' | 'ready' | 'done';

export interface Trip {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: TripStatus;
  created_by: string;
  created_at?: string;
  packing_progress?: string | null;
}

export interface PackingItem {
  id: string;
  trip_id: string;
  title: string;
  category: 'adult' | 'kid' | 'baby' | 'roadtrip' | 'custom';
  is_packed: boolean;
}

export interface TripDocument {
  id: string;
  trip_id: string;
  title: string;
  description: string | null;
  file_url: string;
  created_at?: string;
}

export interface BudgetEntry {
  id: string;
  trip_id: string;
  category: string;
  amount: number;
  currency: string;
  created_at?: string;
}

export interface TimelineEvent {
  id: string;
  trip_id: string;
  title: string;
  date_time: string;
  notes: string | null;
}

export type NewTripPayload = Omit<Trip, 'id' | 'created_at' | 'packing_progress'>;
