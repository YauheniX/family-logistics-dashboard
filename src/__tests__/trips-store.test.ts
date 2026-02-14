import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTripStore } from '@/features/trips/presentation/trips.store';
import type { Trip } from '@/features/shared/domain/entities';

// Mock dependencies
vi.mock('@/features/trips/domain/trip.service', () => ({
  tripService: {
    getUserTrips: vi.fn(),
    getTrip: vi.fn(),
    createTrip: vi.fn(),
    updateTrip: vi.fn(),
    deleteTrip: vi.fn(),
    duplicateTrip: vi.fn(),
  },
}));

vi.mock('@/features/trips', () => ({
  packingItemRepository: {
    findByTripId: vi.fn().mockResolvedValue({ data: [], error: null }),
    upsert: vi.fn(),
    togglePacked: vi.fn(),
  },
  budgetEntryRepository: {
    findByTripId: vi.fn().mockResolvedValue({ data: [], error: null }),
    create: vi.fn(),
  },
  timelineEventRepository: {
    findByTripId: vi.fn().mockResolvedValue({ data: [], error: null }),
    create: vi.fn(),
  },
  documentRepository: {
    findByTripId: vi.fn().mockResolvedValue({ data: [], error: null }),
    create: vi.fn(),
  },
}));

vi.mock('@/features/trips/infrastructure/trip-member.repository', () => ({
  tripMemberRepository: {
    findByTripId: vi.fn().mockResolvedValue({ data: [], error: null }),
    inviteByEmail: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockTrip: Trip = {
  id: '1',
  name: 'Test Trip',
  start_date: '2026-03-01',
  end_date: '2026-03-10',
  status: 'planning',
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
};

describe('Trip Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const store = useTripStore();
    expect(store.trips).toEqual([]);
    expect(store.currentTrip).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('loads trips successfully', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    vi.mocked(tripService.getUserTrips).mockResolvedValue({
      data: [mockTrip],
      error: null,
    });

    const store = useTripStore();
    await store.loadTrips('user-1');

    expect(store.trips).toEqual([mockTrip]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('handles load trips error', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    vi.mocked(tripService.getUserTrips).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const store = useTripStore();
    await store.loadTrips('user-1');

    expect(store.trips).toEqual([]);
    expect(store.error).toBe('Network error');
  });

  it('loads a single trip with related data', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    vi.mocked(tripService.getTrip).mockResolvedValue({
      data: mockTrip,
      error: null,
    });

    const store = useTripStore();
    await store.loadTrip('1');

    expect(store.currentTrip).toEqual(mockTrip);
    expect(store.loading).toBe(false);
  });

  it('handles load single trip error', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    vi.mocked(tripService.getTrip).mockResolvedValue({
      data: null,
      error: { message: 'Trip not found' },
    });

    const store = useTripStore();
    await store.loadTrip('999');

    expect(store.currentTrip).toBeNull();
    expect(store.error).toBe('Trip not found');
  });

  it('creates a trip and prepends to list', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    vi.mocked(tripService.createTrip).mockResolvedValue({
      data: mockTrip,
      error: null,
    });

    const store = useTripStore();
    const result = await store.createTrip({
      name: 'Test Trip',
      start_date: '2026-03-01',
      end_date: '2026-03-10',
      status: 'planning',
      created_by: 'user-1',
    });

    expect(result).toEqual(mockTrip);
    expect(store.trips).toHaveLength(1);
    expect(store.trips[0]).toEqual(mockTrip);
  });

  it('handles create trip error', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    vi.mocked(tripService.createTrip).mockResolvedValue({
      data: null,
      error: { message: 'Create failed' },
    });

    const store = useTripStore();
    const result = await store.createTrip({
      name: 'Test Trip',
      start_date: null,
      end_date: null,
      status: 'planning',
      created_by: 'user-1',
    });

    expect(result).toBeNull();
    expect(store.trips).toHaveLength(0);
  });

  it('updates a trip in the list', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    const updatedTrip = { ...mockTrip, name: 'Updated Trip' };
    vi.mocked(tripService.updateTrip).mockResolvedValue({
      data: updatedTrip,
      error: null,
    });

    const store = useTripStore();
    store.trips = [mockTrip];

    await store.updateTrip('1', { name: 'Updated Trip' });

    expect(store.trips[0].name).toBe('Updated Trip');
    expect(store.currentTrip?.name).toBe('Updated Trip');
  });

  it('handles update trip error', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    vi.mocked(tripService.updateTrip).mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    });

    const store = useTripStore();
    store.trips = [mockTrip];

    const result = await store.updateTrip('1', { name: 'Updated' });

    expect(result).toBeNull();
    expect(store.trips[0].name).toBe('Test Trip');
  });

  it('removes a trip from the list', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    vi.mocked(tripService.deleteTrip).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const store = useTripStore();
    store.trips = [mockTrip];

    await store.removeTrip('1');

    expect(store.trips).toHaveLength(0);
  });

  it('handles remove trip error', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    vi.mocked(tripService.deleteTrip).mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    });

    const store = useTripStore();
    store.trips = [mockTrip];

    await store.removeTrip('1');

    expect(store.trips).toHaveLength(1);
  });

  it('duplicates a trip from the list', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    const duplicated = { ...mockTrip, id: '2', name: 'Test Trip (copy)' };
    vi.mocked(tripService.duplicateTrip).mockResolvedValue({
      data: duplicated,
      error: null,
    });

    const store = useTripStore();
    store.trips = [mockTrip];

    const result = await store.duplicateTrip('1');

    expect(result).toEqual(duplicated);
    expect(store.trips).toHaveLength(2);
  });

  it('duplicates a trip from currentTrip when not in list', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    const duplicated = { ...mockTrip, id: '2', name: 'Test Trip (copy)' };
    vi.mocked(tripService.duplicateTrip).mockResolvedValue({
      data: duplicated,
      error: null,
    });

    const store = useTripStore();
    store.trips = [];
    store.currentTrip = mockTrip;

    const result = await store.duplicateTrip('1');

    expect(result).toEqual(duplicated);
  });

  it('fetches trip before duplicating when not available', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    vi.mocked(tripService.getTrip).mockResolvedValue({
      data: mockTrip,
      error: null,
    });
    const duplicated = { ...mockTrip, id: '2' };
    vi.mocked(tripService.duplicateTrip).mockResolvedValue({
      data: duplicated,
      error: null,
    });

    const store = useTripStore();
    store.trips = [];
    store.currentTrip = null;

    const result = await store.duplicateTrip('1');

    expect(tripService.getTrip).toHaveBeenCalledWith('1');
    expect(result).toEqual(duplicated);
  });

  it('handles duplicate trip error', async () => {
    const { tripService } = await import('@/features/trips/domain/trip.service');
    vi.mocked(tripService.duplicateTrip).mockResolvedValue({
      data: null,
      error: { message: 'Duplicate failed' },
    });

    const store = useTripStore();
    store.trips = [mockTrip];

    const result = await store.duplicateTrip('1');

    expect(result).toBeNull();
    expect(store.error).toBe('Duplicate failed');
  });

  it('loads documents for a trip', async () => {
    const { documentRepository } = await import('@/features/trips');
    vi.mocked(documentRepository.findByTripId).mockResolvedValue({
      data: [{ id: 'd1', trip_id: '1', title: 'Passport', description: null, file_url: 'url', created_at: '' }],
      error: null,
    });

    const store = useTripStore();
    await store.loadDocuments('1');

    expect(store.documents).toHaveLength(1);
  });

  it('adds a document', async () => {
    const { documentRepository } = await import('@/features/trips');
    const doc = { id: 'd1', trip_id: '1', title: 'Ticket', description: null, file_url: 'url', created_at: '' };
    vi.mocked(documentRepository.create).mockResolvedValue({ data: doc, error: null });

    const store = useTripStore();
    await store.addDocument({ trip_id: '1', title: 'Ticket', description: null, file_url: 'url' });

    expect(store.documents).toHaveLength(1);
  });

  it('loads timeline events', async () => {
    const { timelineEventRepository } = await import('@/features/trips');
    vi.mocked(timelineEventRepository.findByTripId).mockResolvedValue({
      data: [{ id: 't1', trip_id: '1', title: 'Departure', date_time: '2026-03-01T10:00:00Z', notes: null }],
      error: null,
    });

    const store = useTripStore();
    await store.loadTimeline('1');

    expect(store.timeline).toHaveLength(1);
  });

  it('adds a timeline event', async () => {
    const { timelineEventRepository } = await import('@/features/trips');
    const event = { id: 't1', trip_id: '1', title: 'Arrival', date_time: '2026-03-01T14:00:00Z', notes: null };
    vi.mocked(timelineEventRepository.create).mockResolvedValue({ data: event, error: null });

    const store = useTripStore();
    await store.addTimelineEvent({ trip_id: '1', title: 'Arrival', date_time: '2026-03-01T14:00:00Z', notes: null });

    expect(store.timeline).toHaveLength(1);
  });

  it('loads members for a trip', async () => {
    const { tripMemberRepository } = await import('@/features/trips/infrastructure/trip-member.repository');
    vi.mocked(tripMemberRepository.findByTripId).mockResolvedValue({
      data: [{ id: 'm1', trip_id: '1', user_id: 'u2', role: 'editor', created_at: '' }],
      error: null,
    });

    const store = useTripStore();
    await store.loadMembers('1');

    expect(store.members).toHaveLength(1);
  });

  it('invites a member', async () => {
    const { tripMemberRepository } = await import('@/features/trips/infrastructure/trip-member.repository');
    const member = { id: 'm1', trip_id: '1', user_id: 'u2', role: 'viewer' as const, created_at: '' };
    vi.mocked(tripMemberRepository.inviteByEmail).mockResolvedValue({ data: member, error: null });

    const store = useTripStore();
    const result = await store.inviteMember('1', 'test@test.com', 'viewer');

    expect(result).toEqual(member);
    expect(store.members).toHaveLength(1);
  });

  it('removes a member', async () => {
    const { tripMemberRepository } = await import('@/features/trips/infrastructure/trip-member.repository');
    vi.mocked(tripMemberRepository.delete).mockResolvedValue({ data: undefined, error: null });

    const store = useTripStore();
    store.members = [{ id: 'm1', trip_id: '1', user_id: 'u2', role: 'viewer', created_at: '' }];

    await store.removeMember('m1');

    expect(store.members).toHaveLength(0);
  });

  it('updates a member role', async () => {
    const { tripMemberRepository } = await import('@/features/trips/infrastructure/trip-member.repository');
    const updated = { id: 'm1', trip_id: '1', user_id: 'u2', role: 'editor' as const, created_at: '' };
    vi.mocked(tripMemberRepository.update).mockResolvedValue({ data: updated, error: null });

    const store = useTripStore();
    store.members = [{ id: 'm1', trip_id: '1', user_id: 'u2', role: 'viewer', created_at: '' }];

    await store.updateMemberRole('m1', 'editor');

    expect(store.members[0].role).toBe('editor');
  });

  it('handles load packing error', async () => {
    const { packingItemRepository } = await import('@/features/trips');
    vi.mocked(packingItemRepository.findByTripId).mockResolvedValue({
      data: null,
      error: { message: 'Load packing failed' },
    });

    const store = useTripStore();
    await store.loadPacking('1');

    expect(store.packing).toEqual([]);
  });

  it('handles save packing item error', async () => {
    const { packingItemRepository } = await import('@/features/trips');
    vi.mocked(packingItemRepository.upsert).mockResolvedValue({
      data: null,
      error: { message: 'Save failed' },
    });

    const store = useTripStore();
    await store.savePackingItem({ trip_id: '1', title: 'Item', category: 'adult', is_packed: false });

    expect(store.packing).toEqual([]);
  });

  it('updates existing packing item via savePackingItem', async () => {
    const { packingItemRepository } = await import('@/features/trips');
    const existing = { id: 'p1', trip_id: '1', title: 'Updated', category: 'adult' as const, is_packed: true };
    vi.mocked(packingItemRepository.upsert).mockResolvedValue({ data: existing, error: null });

    const store = useTripStore();
    store.packing = [{ id: 'p1', trip_id: '1', title: 'Old', category: 'adult', is_packed: false }];

    await store.savePackingItem({ trip_id: '1', title: 'Updated', category: 'adult', is_packed: true });

    expect(store.packing[0].title).toBe('Updated');
    expect(store.packing).toHaveLength(1);
  });

  it('handles load documents error', async () => {
    const { documentRepository } = await import('@/features/trips');
    vi.mocked(documentRepository.findByTripId).mockResolvedValue({
      data: null,
      error: { message: 'Load docs failed' },
    });

    const store = useTripStore();
    await store.loadDocuments('1');

    expect(store.documents).toEqual([]);
  });

  it('handles add document error', async () => {
    const { documentRepository } = await import('@/features/trips');
    vi.mocked(documentRepository.create).mockResolvedValue({
      data: null,
      error: { message: 'Add doc failed' },
    });

    const store = useTripStore();
    await store.addDocument({ trip_id: '1', title: 'Doc', description: null, file_url: 'url' });

    expect(store.documents).toEqual([]);
  });

  it('handles load budget error', async () => {
    const { budgetEntryRepository } = await import('@/features/trips');
    vi.mocked(budgetEntryRepository.findByTripId).mockResolvedValue({
      data: null,
      error: { message: 'Load budget failed' },
    });

    const store = useTripStore();
    await store.loadBudget('1');

    expect(store.budget).toEqual([]);
  });

  it('handles add budget entry error', async () => {
    const { budgetEntryRepository } = await import('@/features/trips');
    vi.mocked(budgetEntryRepository.create).mockResolvedValue({
      data: null,
      error: { message: 'Add budget failed' },
    });

    const store = useTripStore();
    await store.addBudgetEntry({ trip_id: '1', category: 'Food', amount: 50, currency: 'USD', is_planned: false });

    expect(store.budget).toEqual([]);
  });

  it('handles load timeline error', async () => {
    const { timelineEventRepository } = await import('@/features/trips');
    vi.mocked(timelineEventRepository.findByTripId).mockResolvedValue({
      data: null,
      error: { message: 'Load timeline failed' },
    });

    const store = useTripStore();
    await store.loadTimeline('1');

    expect(store.timeline).toEqual([]);
  });

  it('handles add timeline event error', async () => {
    const { timelineEventRepository } = await import('@/features/trips');
    vi.mocked(timelineEventRepository.create).mockResolvedValue({
      data: null,
      error: { message: 'Add event failed' },
    });

    const store = useTripStore();
    await store.addTimelineEvent({ trip_id: '1', title: 'Event', date_time: '2026-03-01T10:00:00Z', notes: null });

    expect(store.timeline).toEqual([]);
  });

  it('handles load members error', async () => {
    const { tripMemberRepository } = await import('@/features/trips/infrastructure/trip-member.repository');
    vi.mocked(tripMemberRepository.findByTripId).mockResolvedValue({
      data: null,
      error: { message: 'Load members failed' },
    });

    const store = useTripStore();
    await store.loadMembers('1');

    expect(store.members).toEqual([]);
  });

  it('handles invite member error', async () => {
    const { tripMemberRepository } = await import('@/features/trips/infrastructure/trip-member.repository');
    vi.mocked(tripMemberRepository.inviteByEmail).mockResolvedValue({
      data: null,
      error: { message: 'Invite failed' },
    });

    const store = useTripStore();
    const result = await store.inviteMember('1', 'test@test.com');

    expect(result).toBeNull();
  });

  it('handles remove member error', async () => {
    const { tripMemberRepository } = await import('@/features/trips/infrastructure/trip-member.repository');
    vi.mocked(tripMemberRepository.delete).mockResolvedValue({
      data: null,
      error: { message: 'Remove failed' },
    });

    const store = useTripStore();
    store.members = [{ id: 'm1', trip_id: '1', user_id: 'u2', role: 'viewer', created_at: '' }];

    await store.removeMember('m1');

    expect(store.members).toHaveLength(1);
  });

  it('handles update member role error', async () => {
    const { tripMemberRepository } = await import('@/features/trips/infrastructure/trip-member.repository');
    vi.mocked(tripMemberRepository.update).mockResolvedValue({
      data: null,
      error: { message: 'Update role failed' },
    });

    const store = useTripStore();
    store.members = [{ id: 'm1', trip_id: '1', user_id: 'u2', role: 'viewer', created_at: '' }];

    await store.updateMemberRole('m1', 'editor');

    expect(store.members[0].role).toBe('viewer');
  });
});
