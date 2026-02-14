/**
 * Domain entities - clean types for business logic
 * These are separate from database types for better domain modeling
 */

export type TripStatus = 'planning' | 'booked' | 'ready' | 'done';
export type PackingCategory = 'adult' | 'kid' | 'baby' | 'roadtrip' | 'custom';
export type TripMemberRole = 'owner' | 'editor' | 'viewer';

/**
 * Trip entity
 */
export interface Trip {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: TripStatus;
  created_by: string;
  created_at: string;
}

export type CreateTripDto = Omit<Trip, 'id' | 'created_at'>;
export type UpdateTripDto = Partial<Omit<Trip, 'id' | 'created_by' | 'created_at'>>;

/**
 * Packing item entity
 */
export interface PackingItem {
  id: string;
  trip_id: string | null;
  title: string;
  category: PackingCategory;
  is_packed: boolean;
}

export type CreatePackingItemDto = Omit<PackingItem, 'id'>;
export type UpdatePackingItemDto = Partial<Omit<PackingItem, 'id'>>;

/**
 * Document entity
 */
export interface TripDocument {
  id: string;
  trip_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  created_at: string;
}

export type CreateDocumentDto = Omit<TripDocument, 'id' | 'created_at'>;
export type UpdateDocumentDto = Partial<Omit<TripDocument, 'id' | 'created_at'>>;

/**
 * Budget entry entity
 */
export interface BudgetEntry {
  id: string;
  trip_id: string | null;
  category: string;
  amount: number;
  currency: string;
  is_planned: boolean;
  created_at: string;
}

export type CreateBudgetEntryDto = Omit<BudgetEntry, 'id' | 'created_at'>;
export type UpdateBudgetEntryDto = Partial<Omit<BudgetEntry, 'id' | 'created_at'>>;

/**
 * Timeline event entity
 */
export interface TimelineEvent {
  id: string;
  trip_id: string | null;
  title: string;
  date_time: string;
  notes: string | null;
}

export type CreateTimelineEventDto = Omit<TimelineEvent, 'id'>;
export type UpdateTimelineEventDto = Partial<Omit<TimelineEvent, 'id'>>;

/**
 * Packing template entity
 */
export interface PackingTemplate {
  id: string;
  name: string;
  category: PackingCategory;
  created_by: string;
  created_at: string;
}

export type CreatePackingTemplateDto = Omit<PackingTemplate, 'id' | 'created_at'>;
export type UpdatePackingTemplateDto = Partial<Omit<PackingTemplate, 'id' | 'created_at'>>;

/**
 * Packing template item entity
 */
export interface PackingTemplateItem {
  id: string;
  template_id: string | null;
  title: string;
}

export type CreatePackingTemplateItemDto = Omit<PackingTemplateItem, 'id'>;

/**
 * Trip member entity
 */
export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: TripMemberRole;
  created_at: string;
  email?: string; // Populated via function
}

export type CreateTripMemberDto = Omit<TripMember, 'id' | 'created_at' | 'email'>;
export type UpdateTripMemberDto = Partial<Pick<TripMember, 'role'>>;

/**
 * Budget category total (computed)
 */
export interface CategoryTotal {
  category: string;
  planned: number;
  spent: number;
}
