import { defineStore } from 'pinia';
import { useToastStore } from '@/stores/toast';
import { tripService } from '@/features/trips/domain/trip.service';
import {
  packingItemRepository,
  budgetEntryRepository,
  timelineEventRepository,
  documentRepository,
} from '@/features/trips';
import { tripMemberRepository } from '@/features/trips/infrastructure/trip-member.repository';
import type {
  Trip,
  CreateTripDto,
  UpdateTripDto,
  PackingItem,
  CreatePackingItemDto,
  TripDocument,
  CreateDocumentDto,
  BudgetEntry,
  CreateBudgetEntryDto,
  TimelineEvent,
  CreateTimelineEventDto,
  TripMember,
  TripMemberRole,
  CategoryTotal,
} from '@/features/shared/domain/entities';

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
        const response = await tripService.getUserTrips(userId);
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
        const response = await tripService.getTrip(id);
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

    async createTrip(payload: CreateTripDto) {
      this.loading = true;
      try {
        const response = await tripService.createTrip(payload);
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

    async updateTrip(id: string, payload: UpdateTripDto) {
      this.loading = true;
      try {
        const response = await tripService.updateTrip(id, payload);
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
        const response = await tripService.deleteTrip(id);
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
        const response = await tripService.getTrip(id);
        if (response.error) {
          useToastStore().error(`Failed to fetch trip: ${response.error.message}`);
          return null;
        }
        source = response.data;
      }

      if (!source) return null;

      this.error = null;
      const response = await tripService.duplicateTrip(source);
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
    },

    async loadPacking(tripId: string) {
      const response = await packingItemRepository.findByTripId(tripId);
      if (response.error) {
        useToastStore().error(`Failed to load packing items: ${response.error.message}`);
      } else {
        this.packing = response.data ?? [];
      }
    },

    async savePackingItem(item: CreatePackingItemDto) {
      const response = await packingItemRepository.upsert(item);
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
      const response = await packingItemRepository.togglePacked(id, isPacked);
      if (response.error) {
        useToastStore().error(`Failed to update packing item: ${response.error.message}`);
      } else {
        this.packing = this.packing.map((item) =>
          item.id === id ? { ...item, is_packed: isPacked } : item,
        );
      }
    },

    async loadDocuments(tripId: string) {
      const response = await documentRepository.findByTripId(tripId);
      if (response.error) {
        useToastStore().error(`Failed to load documents: ${response.error.message}`);
      } else {
        this.documents = response.data ?? [];
      }
    },

    async addDocument(doc: CreateDocumentDto) {
      const response = await documentRepository.create(doc);
      if (response.error) {
        useToastStore().error(`Failed to add document: ${response.error.message}`);
      } else if (response.data) {
        this.documents.unshift(response.data);
        useToastStore().success('Document added successfully!');
      }
    },

    async loadBudget(tripId: string) {
      const response = await budgetEntryRepository.findByTripId(tripId);
      if (response.error) {
        useToastStore().error(`Failed to load budget entries: ${response.error.message}`);
      } else {
        this.budget = response.data ?? [];
      }
    },

    async addBudgetEntry(entry: CreateBudgetEntryDto) {
      const response = await budgetEntryRepository.create(entry);
      if (response.error) {
        useToastStore().error(`Failed to add budget entry: ${response.error.message}`);
      } else if (response.data) {
        this.budget.unshift(response.data);
        useToastStore().success('Budget entry added successfully!');
      }
    },

    async loadTimeline(tripId: string) {
      const response = await timelineEventRepository.findByTripId(tripId);
      if (response.error) {
        useToastStore().error(`Failed to load timeline events: ${response.error.message}`);
      } else {
        this.timeline = response.data ?? [];
      }
    },

    async addTimelineEvent(event: CreateTimelineEventDto) {
      const response = await timelineEventRepository.create(event);
      if (response.error) {
        useToastStore().error(`Failed to add timeline event: ${response.error.message}`);
      } else if (response.data) {
        this.timeline.push(response.data);
        useToastStore().success('Timeline event added successfully!');
      }
    },

    async loadMembers(tripId: string) {
      const response = await tripMemberRepository.findByTripId(tripId);
      if (response.error) {
        useToastStore().error(`Failed to load members: ${response.error.message}`);
      } else {
        this.members = response.data ?? [];
      }
    },

    async inviteMember(
      tripId: string,
      email: string,
      role: TripMemberRole = 'viewer',
      currentUserId?: string
    ) {
      const response = await tripMemberRepository.inviteByEmail(tripId, email, role, currentUserId);
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
      const response = await tripMemberRepository.delete(memberId);
      if (response.error) {
        useToastStore().error(`Failed to remove member: ${response.error.message}`);
      } else {
        this.members = this.members.filter((m) => m.id !== memberId);
        useToastStore().success('Member removed successfully!');
      }
    },

    async updateMemberRole(memberId: string, role: TripMemberRole) {
      const response = await tripMemberRepository.update(memberId, { role });
      if (response.error) {
        useToastStore().error(`Failed to update member role: ${response.error.message}`);
      } else if (response.data) {
        this.members = this.members.map((m) => (m.id === memberId ? response.data! : m));
        useToastStore().success('Member role updated successfully!');
      }
    },
  },
});
