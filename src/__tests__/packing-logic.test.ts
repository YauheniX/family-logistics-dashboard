import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTripStore } from '@/features/trips/presentation/trips.store';
import type { PackingItem } from '@/features/shared/domain/entities';

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
    findByTripId: vi.fn(),
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

const mockPackingItems: PackingItem[] = [
  { id: '1', trip_id: 'trip-1', title: 'Sunscreen', category: 'adult', is_packed: true },
  { id: '2', trip_id: 'trip-1', title: 'Toys', category: 'kid', is_packed: false },
  { id: '3', trip_id: 'trip-1', title: 'Diapers', category: 'baby', is_packed: false },
  { id: '4', trip_id: 'trip-1', title: 'Maps', category: 'roadtrip', is_packed: true },
];

describe('Packing Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('toggles packed state for an item', async () => {
    const { packingItemRepository } = await import('@/features/trips');
    vi.mocked(packingItemRepository.togglePacked).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const store = useTripStore();
    store.packing = [...mockPackingItems];

    await store.togglePacked('2', true);

    const item = store.packing.find((i) => i.id === '2');
    expect(item?.is_packed).toBe(true);
  });

  it('does not update state on toggle error', async () => {
    const { packingItemRepository } = await import('@/features/trips');
    vi.mocked(packingItemRepository.togglePacked).mockResolvedValue({
      data: null,
      error: { message: 'Failed to update' },
    });

    const store = useTripStore();
    store.packing = [...mockPackingItems];

    await store.togglePacked('2', true);

    const item = store.packing.find((i) => i.id === '2');
    expect(item?.is_packed).toBe(false);
  });

  it('calculates packing progress correctly', () => {
    const store = useTripStore();
    store.packing = [...mockPackingItems];

    const packed = store.packing.filter((i) => i.is_packed).length;
    const total = store.packing.length;
    const progress = total > 0 ? Math.round((packed / total) * 100) : 0;

    expect(packed).toBe(2);
    expect(total).toBe(4);
    expect(progress).toBe(50);
  });

  it('handles empty packing list progress', () => {
    const store = useTripStore();
    store.packing = [];

    const packed = store.packing.filter((i) => i.is_packed).length;
    const total = store.packing.length;
    const progress = total > 0 ? Math.round((packed / total) * 100) : 0;

    expect(progress).toBe(0);
  });

  it('handles fully packed list', () => {
    const store = useTripStore();
    store.packing = mockPackingItems.map((item) => ({ ...item, is_packed: true }));

    const packed = store.packing.filter((i) => i.is_packed).length;
    const total = store.packing.length;
    const progress = total > 0 ? Math.round((packed / total) * 100) : 0;

    expect(progress).toBe(100);
  });

  it('saves a new packing item', async () => {
    const { packingItemRepository } = await import('@/features/trips');
    const newItem: PackingItem = {
      id: '5',
      trip_id: 'trip-1',
      title: 'Towel',
      category: 'adult',
      is_packed: false,
    };
    vi.mocked(packingItemRepository.upsert).mockResolvedValue({
      data: newItem,
      error: null,
    });

    const store = useTripStore();
    store.packing = [...mockPackingItems];

    await store.savePackingItem({
      trip_id: 'trip-1',
      title: 'Towel',
      category: 'adult',
      is_packed: false,
    });

    expect(store.packing).toHaveLength(5);
    expect(store.packing[4].title).toBe('Towel');
  });
});
