import { defineStore } from 'pinia';
import {
  addBudgetEntry,
  addDocument,
  addTimelineEvent,
  createTrip,
  deleteTrip,
  duplicateTrip,
  fetchBudgetEntries,
  fetchDocuments,
  fetchPackingItems,
  fetchTimelineEvents,
  fetchTrip,
  fetchTrips,
  togglePacked,
  updateTrip,
  upsertPackingItem,
} from '@/services/tripService';
import {
  fetchTripMembers,
  inviteMemberByEmail,
  removeTripMember,
  updateMemberRole,
} from '@/services/tripMemberService';
import { useToastStore } from '@/stores/toast';
import type {
  BudgetEntry,
  CategoryTotal,
  NewTripPayload,
  PackingItem,
  TimelineEvent,
  Trip,
  TripDocument,
  TripMember,
  TripMemberRole,
} from '@/types/entities';

interface TripState {
  trips: Trip[];
  currentTrip: Trip | null;
  packing: PackingItem[];
  documents: TripDocument[];
  budget: BudgetEntry[];
  timeline: TimelineEvent[];
  members: TripMember[];
  loading: boolean;
  error: string | null;
}

export const useTripStore = defineStore('trips', {
  state: (): TripState => ({
    trips: [],
    currentTrip: null,
    packing: [],
    documents: [],
    budget: [],
    timeline: [],
    members: [],
    loading: false,
    error: null,
  }),
  getters: {
    totalBudget: (state) => state.budget.reduce((sum, entry) => sum + (entry.amount || 0), 0),
    totalPlanned: (state) =>
      state.budget.filter((e) => e.is_planned).reduce((sum, e) => sum + (e.amount || 0), 0),
    totalSpent: (state) =>
      state.budget.filter((e) => !e.is_planned).reduce((sum, e) => sum + (e.amount || 0), 0),
    categoryBreakdown: (state): CategoryTotal[] => {
      const map = new Map<string, { planned: number; spent: number }>();
      for (const entry of state.budget) {
        const key = entry.category;
        const current = map.get(key) ?? { planned: 0, spent: 0 };
        if (entry.is_planned) {
          current.planned += entry.amount || 0;
        } else {
          current.spent += entry.amount || 0;
        }
        map.set(key, current);
      }
      return Array.from(map.entries()).map(([category, totals]) => ({
        category,
        ...totals,
      }));
    },
  },
  actions: {
    async loadTrips(userId: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await fetchTrips(userId);
        if (response.error) {
          this.error = response.error.message;
          useToastStore().error(`Failed to load trips: ${response.error.message}`);
        } else {
          this.trips = response.data ?? [];
        }
      } finally {
        this.loading = false;
      }
    },

    async loadTrip(id: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await fetchTrip(id);
        if (response.error) {
          this.error = response.error.message;
          useToastStore().error(`Failed to load trip: ${response.error.message}`);
        } else {
          this.currentTrip = response.data;
          if (this.currentTrip) {
            await Promise.all([
              this.loadPacking(id),
              this.loadDocuments(id),
              this.loadBudget(id),
              this.loadTimeline(id),
              this.loadMembers(id),
            ]);
          }
        }
      } finally {
        this.loading = false;
      }
    },

    async createTrip(payload: NewTripPayload) {
      this.loading = true;
      try {
        const response = await createTrip(payload);
        if (response.error) {
          useToastStore().error(`Failed to create trip: ${response.error.message}`);
          return null;
        }
        if (response.data) {
          this.trips.unshift(response.data);
          useToastStore().success('Trip created successfully!');
        }
        return response.data;
      } finally {
        this.loading = false;
      }
    },

    async updateTrip(id: string, payload: Partial<NewTripPayload>) {
      this.loading = true;
      try {
        const response = await updateTrip(id, payload);
        if (response.error) {
          useToastStore().error(`Failed to update trip: ${response.error.message}`);
          return null;
        }
        if (response.data) {
          this.trips = this.trips.map((t) => (t.id === id ? response.data! : t));
          this.currentTrip = response.data;
          useToastStore().success('Trip updated successfully!');
        }
        return response.data;
      } finally {
        this.loading = false;
      }
    },

    async removeTrip(id: string) {
      this.loading = true;
      try {
        const response = await deleteTrip(id);
        if (response.error) {
          useToastStore().error(`Failed to delete trip: ${response.error.message}`);
        } else {
          this.trips = this.trips.filter((t) => t.id !== id);
          useToastStore().success('Trip deleted successfully!');
        }
      } finally {
        this.loading = false;
      }
    },

    async duplicateTrip(id: string) {
      const fromList = this.trips.find((t) => t.id === id);
      const fromCurrentTrip = this.currentTrip?.id === id ? this.currentTrip : null;
      
      let source = fromList ?? fromCurrentTrip;
      if (!source) {
        const response = await fetchTrip(id);
        if (response.error) {
          useToastStore().error(`Failed to fetch trip: ${response.error.message}`);
          return null;
        }
        source = response.data;
      }
      
      if (!source) return null;
      
      this.error = null;
      try {
        const response = await duplicateTrip(source);
        if (response.error) {
          this.error = response.error.message;
          useToastStore().error(`Failed to duplicate trip: ${response.error.message}`);
          return null;
        }
        if (response.data) {
          this.trips.unshift(response.data);
          useToastStore().success('Trip duplicated successfully!');
        }
        return response.data;
      } catch (err: any) {
        this.error = err.message ?? 'Unable to duplicate trip';
        useToastStore().error(`Failed to duplicate trip: ${err.message}`);
        throw err;
      }
    },

    async loadPacking(tripId: string) {
      const response = await fetchPackingItems(tripId);
      if (response.error) {
        useToastStore().error(`Failed to load packing items: ${response.error.message}`);
      } else {
        this.packing = response.data ?? [];
      }
    },

    async savePackingItem(item: Partial<PackingItem> & { trip_id: string }) {
      const response = await upsertPackingItem(item);
      if (response.error) {
        useToastStore().error(`Failed to save packing item: ${response.error.message}`);
      } else if (response.data) {
        const exists = this.packing.find((i) => i.id === response.data!.id);
        if (exists) {
          this.packing = this.packing.map((i) => (i.id === response.data!.id ? response.data! : i));
        } else {
          this.packing.push(response.data);
        }
      }
    },

    async togglePacked(id: string, isPacked: boolean) {
      const response = await togglePacked(id, isPacked);
      if (response.error) {
        useToastStore().error(`Failed to update packing item: ${response.error.message}`);
      } else {
        this.packing = this.packing.map((item) =>
          item.id === id ? { ...item, is_packed: isPacked } : item,
        );
      }
    },

    async loadDocuments(tripId: string) {
      const response = await fetchDocuments(tripId);
      if (response.error) {
        useToastStore().error(`Failed to load documents: ${response.error.message}`);
      } else {
        this.documents = response.data ?? [];
      }
    },

    async addDocument(doc: Omit<TripDocument, 'id'>) {
      const response = await addDocument(doc);
      if (response.error) {
        useToastStore().error(`Failed to add document: ${response.error.message}`);
      } else if (response.data) {
        this.documents.unshift(response.data);
        useToastStore().success('Document added successfully!');
      }
    },

    async loadBudget(tripId: string) {
      const response = await fetchBudgetEntries(tripId);
      if (response.error) {
        useToastStore().error(`Failed to load budget entries: ${response.error.message}`);
      } else {
        this.budget = response.data ?? [];
      }
    },

    async addBudgetEntry(entry: Omit<BudgetEntry, 'id'>) {
      const response = await addBudgetEntry(entry);
      if (response.error) {
        useToastStore().error(`Failed to add budget entry: ${response.error.message}`);
      } else if (response.data) {
        this.budget.unshift(response.data);
        useToastStore().success('Budget entry added successfully!');
      }
    },

    async loadTimeline(tripId: string) {
      const response = await fetchTimelineEvents(tripId);
      if (response.error) {
        useToastStore().error(`Failed to load timeline events: ${response.error.message}`);
      } else {
        this.timeline = response.data ?? [];
      }
    },

    async addTimelineEvent(event: Omit<TimelineEvent, 'id'>) {
      const response = await addTimelineEvent(event);
      if (response.error) {
        useToastStore().error(`Failed to add timeline event: ${response.error.message}`);
      } else if (response.data) {
        this.timeline.push(response.data);
        useToastStore().success('Timeline event added successfully!');
      }
    },

    async loadMembers(tripId: string) {
      const response = await fetchTripMembers(tripId);
      if (response.error) {
        useToastStore().error(`Failed to load members: ${response.error.message}`);
      } else {
        this.members = response.data ?? [];
      }
    },

    async inviteMember(tripId: string, email: string, role: TripMemberRole = 'viewer', currentUserId?: string) {
      const response = await inviteMemberByEmail(tripId, email, role, currentUserId);
      if (response.error) {
        useToastStore().error(`Failed to invite member: ${response.error.message}`);
        return null;
      }
      if (response.data) {
        this.members.push(response.data);
        useToastStore().success('Member invited successfully!');
      }
      return response.data;
    },

    async removeMember(memberId: string) {
      const response = await removeTripMember(memberId);
      if (response.error) {
        useToastStore().error(`Failed to remove member: ${response.error.message}`);
      } else {
        this.members = this.members.filter((m) => m.id !== memberId);
        useToastStore().success('Member removed successfully!');
      }
    },

    async updateMemberRole(memberId: string, role: TripMemberRole) {
      const response = await updateMemberRole(memberId, role);
      if (response.error) {
        useToastStore().error(`Failed to update member role: ${response.error.message}`);
      } else if (response.data) {
        this.members = this.members.map((m) => (m.id === memberId ? response.data! : m));
        useToastStore().success('Member role updated successfully!');
      }
    },
  },
});
