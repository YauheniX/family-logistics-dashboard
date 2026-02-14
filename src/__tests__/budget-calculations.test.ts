import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTripStore } from '@/features/trips/presentation/trips.store';
import type { BudgetEntry } from '@/features/shared/domain/entities';

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
    findByTripId: vi.fn(),
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

const mockBudgetEntries: BudgetEntry[] = [
  {
    id: '1',
    trip_id: 'trip-1',
    category: 'Transport',
    amount: 200,
    currency: 'USD',
    is_planned: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    trip_id: 'trip-1',
    category: 'Transport',
    amount: 150,
    currency: 'USD',
    is_planned: false,
    created_at: '2026-01-02T00:00:00Z',
  },
  {
    id: '3',
    trip_id: 'trip-1',
    category: 'Food',
    amount: 300,
    currency: 'USD',
    is_planned: true,
    created_at: '2026-01-03T00:00:00Z',
  },
  {
    id: '4',
    trip_id: 'trip-1',
    category: 'Food',
    amount: 100,
    currency: 'USD',
    is_planned: false,
    created_at: '2026-01-04T00:00:00Z',
  },
  {
    id: '5',
    trip_id: 'trip-1',
    category: 'Accommodation',
    amount: 500,
    currency: 'USD',
    is_planned: true,
    created_at: '2026-01-05T00:00:00Z',
  },
];

describe('Budget Calculations', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('calculates total budget correctly', () => {
    const store = useTripStore();
    store.budget = [...mockBudgetEntries];

    expect(store.totalBudget).toBe(1250);
  });

  it('calculates total planned correctly', () => {
    const store = useTripStore();
    store.budget = [...mockBudgetEntries];

    expect(store.totalPlanned).toBe(1000);
  });

  it('calculates total spent correctly', () => {
    const store = useTripStore();
    store.budget = [...mockBudgetEntries];

    expect(store.totalSpent).toBe(250);
  });

  it('returns zero totals for empty budget', () => {
    const store = useTripStore();
    store.budget = [];

    expect(store.totalBudget).toBe(0);
    expect(store.totalPlanned).toBe(0);
    expect(store.totalSpent).toBe(0);
  });

  it('groups budget by category with planned and spent', () => {
    const store = useTripStore();
    store.budget = [...mockBudgetEntries];

    const breakdown = store.categoryBreakdown;

    expect(breakdown).toHaveLength(3);

    const transport = breakdown.find((c) => c.category === 'Transport');
    expect(transport?.planned).toBe(200);
    expect(transport?.spent).toBe(150);

    const food = breakdown.find((c) => c.category === 'Food');
    expect(food?.planned).toBe(300);
    expect(food?.spent).toBe(100);

    const accommodation = breakdown.find((c) => c.category === 'Accommodation');
    expect(accommodation?.planned).toBe(500);
    expect(accommodation?.spent).toBe(0);
  });

  it('returns empty category breakdown for no entries', () => {
    const store = useTripStore();
    store.budget = [];

    expect(store.categoryBreakdown).toEqual([]);
  });

  it('adds a budget entry to the list', async () => {
    const { budgetEntryRepository } = await import('@/features/trips');
    const newEntry: BudgetEntry = {
      id: '6',
      trip_id: 'trip-1',
      category: 'Entertainment',
      amount: 75,
      currency: 'USD',
      is_planned: false,
      created_at: '2026-01-06T00:00:00Z',
    };
    vi.mocked(budgetEntryRepository.create).mockResolvedValue({
      data: newEntry,
      error: null,
    });

    const store = useTripStore();
    store.budget = [...mockBudgetEntries];

    await store.addBudgetEntry({
      trip_id: 'trip-1',
      category: 'Entertainment',
      amount: 75,
      currency: 'USD',
      is_planned: false,
    });

    expect(store.budget).toHaveLength(6);
    expect(store.totalBudget).toBe(1325);
  });
});
