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
import type {
  BudgetEntry,
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
  },
  actions: {
    async loadTrips(userId: string) {
      this.loading = true;
      try {
        this.trips = await fetchTrips(userId);
      } catch (err: any) {
        this.error = err.message ?? 'Unable to load trips';
      } finally {
        this.loading = false;
      }
    },

    async loadTrip(id: string) {
      this.loading = true;
      try {
        this.currentTrip = await fetchTrip(id);
        if (this.currentTrip) {
          await Promise.all([
            this.loadPacking(id),
            this.loadDocuments(id),
            this.loadBudget(id),
            this.loadTimeline(id),
            this.loadMembers(id),
          ]);
        }
      } catch (err: any) {
        this.error = err.message ?? 'Unable to load trip';
      } finally {
        this.loading = false;
      }
    },

    async createTrip(payload: NewTripPayload) {
      this.loading = true;
      try {
        const trip = await createTrip(payload);
        if (trip) this.trips.unshift(trip);
        return trip;
      } finally {
        this.loading = false;
      }
    },

    async updateTrip(id: string, payload: Partial<NewTripPayload>) {
      this.loading = true;
      try {
        const updated = await updateTrip(id, payload);
        this.trips = this.trips.map((t) => (t.id === id && updated ? updated : t));
        this.currentTrip = updated;
        return updated;
      } finally {
        this.loading = false;
      }
    },

    async removeTrip(id: string) {
      this.loading = true;
      try {
        await deleteTrip(id);
        this.trips = this.trips.filter((t) => t.id !== id);
      } finally {
        this.loading = false;
      }
    },

    async duplicateTrip(id: string) {
      const fromList = this.trips.find((t) => t.id === id);
      const fromCurrentTrip = this.currentTrip?.id === id ? this.currentTrip : null;
      const source = fromList ?? fromCurrentTrip ?? (await fetchTrip(id));
      if (!source) return null;
      this.error = null;
      try {
        const cloned = await duplicateTrip(source);
        if (cloned) this.trips.unshift(cloned);
        return cloned;
      } catch (err: any) {
        this.error = err.message ?? 'Unable to duplicate trip';
        throw err;
      }
    },

    async loadPacking(tripId: string) {
      this.packing = await fetchPackingItems(tripId);
    },

    async savePackingItem(item: Partial<PackingItem> & { trip_id: string }) {
      const saved = await upsertPackingItem(item);
      if (saved) {
        const exists = this.packing.find((i) => i.id === saved.id);
        if (exists) {
          this.packing = this.packing.map((i) => (i.id === saved.id ? saved : i));
        } else {
          this.packing.push(saved);
        }
      }
    },

    async togglePacked(id: string, isPacked: boolean) {
      await togglePacked(id, isPacked);
      this.packing = this.packing.map((item) =>
        item.id === id ? { ...item, is_packed: isPacked } : item,
      );
    },

    async loadDocuments(tripId: string) {
      this.documents = await fetchDocuments(tripId);
    },

    async addDocument(doc: Omit<TripDocument, 'id'>) {
      const saved = await addDocument(doc);
      if (saved) this.documents.unshift(saved);
    },

    async loadBudget(tripId: string) {
      this.budget = await fetchBudgetEntries(tripId);
    },

    async addBudgetEntry(entry: Omit<BudgetEntry, 'id'>) {
      const saved = await addBudgetEntry(entry);
      if (saved) this.budget.unshift(saved);
    },

    async loadTimeline(tripId: string) {
      this.timeline = await fetchTimelineEvents(tripId);
    },

    async addTimelineEvent(event: Omit<TimelineEvent, 'id'>) {
      const saved = await addTimelineEvent(event);
      if (saved) this.timeline.push(saved);
    },

    async loadMembers(tripId: string) {
      this.members = await fetchTripMembers(tripId);
    },

    async inviteMember(tripId: string, email: string, role: TripMemberRole = 'viewer') {
      const member = await inviteMemberByEmail(tripId, email, role);
      if (member) this.members.push(member);
      return member;
    },

    async removeMember(memberId: string) {
      await removeTripMember(memberId);
      this.members = this.members.filter((m) => m.id !== memberId);
    },

    async updateMemberRole(memberId: string, role: TripMemberRole) {
      const updated = await updateMemberRole(memberId, role);
      if (updated) {
        this.members = this.members.map((m) => (m.id === memberId ? updated : m));
      }
    },
  },
});
