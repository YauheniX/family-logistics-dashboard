import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';

vi.mock('@/features/wishlist/domain/wishlist.service', () => ({
  wishlistService: {
    getUserWishlists: vi.fn(),
    getUserWishlistsByHousehold: vi.fn(),
    getWishlist: vi.fn(),
    getWishlistBySlug: vi.fn(),
    getHouseholdWishlists: vi.fn(),
    getChildrenWishlists: vi.fn(),
    createWishlist: vi.fn(),
    updateWishlist: vi.fn(),
    deleteWishlist: vi.fn(),
    getWishlistItems: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    reserveItem: vi.fn(),
  },
}));

const mockWishlist = {
  id: 'w1',
  user_id: 'u1',
  title: 'Birthday Wishes',
  description: null,
  is_public: true,
  visibility: 'public' as const,
  share_slug: 'abc12345',
  created_at: '2024-01-01T00:00:00Z',
};

const mockItem = {
  id: 'wi1',
  wishlist_id: 'w1',
  title: 'Headphones',
  description: null,
  link: null,
  price: 99.99,
  currency: 'USD',
  priority: 'high' as const,
  is_reserved: false,
  reserved_by_email: null,
  reserved_by_name: null,
  reserved_at: null,
  created_at: '2024-01-01T00:00:00Z',
};

describe('Wishlist Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with default state', () => {
    const store = useWishlistStore();
    expect(store.wishlists).toEqual([]);
    expect(store.currentWishlist).toBeNull();
    expect(store.items).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  // ─── loadWishlists ────────────────────────────────────────

  it('loads wishlists successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getUserWishlists).mockResolvedValue({
      data: [mockWishlist],
      error: null,
    });

    const store = useWishlistStore();
    await store.loadWishlists('u1');

    expect(store.wishlists).toEqual([mockWishlist]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('handles loadWishlists error', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getUserWishlists).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const store = useWishlistStore();
    await store.loadWishlists('u1');

    expect(store.wishlists).toEqual([]);
    expect(store.error).toBe('Network error');
  });

  // ─── loadWishlist ──────────────────────────────────────────

  it('loads a single wishlist successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getWishlist).mockResolvedValue({
      data: mockWishlist,
      error: null,
    });
    vi.mocked(wishlistService.getWishlistItems).mockResolvedValue({
      data: [mockItem],
      error: null,
    });

    const store = useWishlistStore();
    await store.loadWishlist('w1');

    expect(store.currentWishlist).toEqual(mockWishlist);
    expect(store.items).toEqual([mockItem]);
    expect(store.loading).toBe(false);
  });

  it('handles loadWishlist error', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getWishlist).mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const store = useWishlistStore();
    await store.loadWishlist('w1');

    expect(store.currentWishlist).toBeNull();
    expect(store.error).toBe('Not found');
    expect(store.loading).toBe(false);
  });

  // ─── updateWishlist ───────────────────────────────────────

  it('updates a wishlist successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    const updated = { ...mockWishlist, title: 'Updated Wishes' };
    vi.mocked(wishlistService.updateWishlist).mockResolvedValue({
      data: updated,
      error: null,
    });

    const store = useWishlistStore();
    store.$patch({ wishlists: [mockWishlist] });
    const result = await store.updateWishlist('w1', { title: 'Updated Wishes' });

    expect(result).toEqual(updated);
    expect(store.wishlists[0].title).toBe('Updated Wishes');
    expect(store.currentWishlist).toEqual(updated);
  });

  it('handles updateWishlist error', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.updateWishlist).mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    });

    const store = useWishlistStore();
    store.$patch({ wishlists: [mockWishlist] });
    const result = await store.updateWishlist('w1', { title: 'Updated Wishes' });

    expect(result).toBeNull();
    expect(store.wishlists[0].title).toBe('Birthday Wishes');
  });

  // ─── removeWishlist ───────────────────────────────────────

  it('removes a wishlist successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.deleteWishlist).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const store = useWishlistStore();
    store.$patch({ wishlists: [mockWishlist] });
    await store.removeWishlist('w1');

    expect(store.wishlists).toEqual([]);
  });

  it('handles removeWishlist error', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.deleteWishlist).mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    });

    const store = useWishlistStore();
    store.$patch({ wishlists: [mockWishlist] });
    await store.removeWishlist('w1');

    expect(store.wishlists).toContainEqual(mockWishlist);
  });

  // ─── loadItems ────────────────────────────────────────────

  it('loads wishlist items successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getWishlistItems).mockResolvedValue({
      data: [mockItem],
      error: null,
    });

    const store = useWishlistStore();
    await store.loadItems('w1');

    expect(store.items).toEqual([mockItem]);
  });

  it('handles loadItems error', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getWishlistItems).mockResolvedValue({
      data: null,
      error: { message: 'Load failed' },
    });

    const store = useWishlistStore();
    await store.loadItems('w1');

    expect(store.items).toEqual([]);
  });

  // ─── updateItem ───────────────────────────────────────────

  it('updates a wishlist item successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    const updated = { ...mockItem, title: 'Updated Headphones' };
    vi.mocked(wishlistService.updateItem).mockResolvedValue({
      data: updated,
      error: null,
    });

    const store = useWishlistStore();
    store.$patch({ items: [mockItem] });
    const result = await store.updateItem('wi1', { title: 'Updated Headphones' });

    expect(result).toEqual(updated);
    expect(store.items[0].title).toBe('Updated Headphones');
  });

  it('handles updateItem error', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.updateItem).mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    });

    const store = useWishlistStore();
    store.$patch({ items: [mockItem] });
    const result = await store.updateItem('wi1', { title: 'Updated Headphones' });

    expect(result).toBeNull();
    expect(store.items[0].title).toBe('Headphones');
  });

  // ─── removeItem ───────────────────────────────────────────

  it('removes a wishlist item successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.deleteItem).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const store = useWishlistStore();
    store.$patch({ items: [mockItem] });
    await store.removeItem('wi1');

    expect(store.items).toEqual([]);
  });

  it('handles removeItem error', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.deleteItem).mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    });

    const store = useWishlistStore();
    store.$patch({ items: [mockItem] });
    await store.removeItem('wi1');

    expect(store.items).toContainEqual(mockItem);
  });

  // ─── createWishlist ───────────────────────────────────────

  it('creates a wishlist successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.createWishlist).mockResolvedValue({
      data: mockWishlist,
      error: null,
    });

    const store = useWishlistStore();
    const result = await store.createWishlist({
      title: 'Birthday Wishes',
      description: null,
      visibility: 'public',
    });

    expect(result).toEqual(mockWishlist);
    expect(store.wishlists).toContainEqual(mockWishlist);
    expect(store.loading).toBe(false);
  });

  it('handles createWishlist error', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.createWishlist).mockResolvedValue({
      data: null,
      error: { message: 'Creation failed' },
    });

    const store = useWishlistStore();
    const result = await store.createWishlist({
      title: 'Birthday Wishes',
      description: null,
      visibility: 'public',
    });

    expect(result).toBeNull();
    expect(store.wishlists).toEqual([]);
  });

  // ─── loadWishlistBySlug ───────────────────────────────────

  it('loads a wishlist by slug successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getWishlistBySlug).mockResolvedValue({
      data: mockWishlist,
      error: null,
    });
    vi.mocked(wishlistService.getWishlistItems).mockResolvedValue({
      data: [mockItem],
      error: null,
    });

    const store = useWishlistStore();
    await store.loadWishlistBySlug('abc12345');

    expect(store.currentWishlist).toEqual(mockWishlist);
    expect(store.items).toEqual([mockItem]);
    expect(store.loading).toBe(false);
  });

  it('handles loadWishlistBySlug error', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getWishlistBySlug).mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const store = useWishlistStore();
    await store.loadWishlistBySlug('badslug');

    expect(store.currentWishlist).toBeNull();
    expect(store.error).toBe('Not found');
  });

  // ─── addItem ──────────────────────────────────────────────

  it('adds an item successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.addItem).mockResolvedValue({
      data: mockItem,
      error: null,
    });

    const store = useWishlistStore();
    const result = await store.addItem({
      wishlist_id: 'w1',
      title: 'Headphones',
      description: null,
      link: null,
      price: 99.99,
      currency: 'USD',

      priority: 'high',
    });

    expect(result).toEqual(mockItem);
    expect(store.items).toContainEqual(mockItem);
  });

  it('handles addItem error', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.addItem).mockResolvedValue({
      data: null,
      error: { message: 'Add failed' },
    });

    const store = useWishlistStore();
    const result = await store.addItem({
      wishlist_id: 'w1',
      title: 'Headphones',
      description: null,
      link: null,
      price: 99.99,
      currency: 'USD',
      priority: 'high',
    });

    expect(result).toBeNull();
    expect(store.items).toEqual([]);
  });

  // ─── reserveItem ──────────────────────────────────────────

  it('reserves an item successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    const reservedItem = {
      ...mockItem,
      is_reserved: true,
      reserved_by_email: 'gift@example.com',
      reserved_by_name: 'Gift Giver',
    };
    vi.mocked(wishlistService.reserveItem).mockResolvedValue({
      data: reservedItem,
      error: null,
    });

    const store = useWishlistStore();
    store.$patch({ items: [mockItem] });
    const result = await store.reserveItem('wi1', 'Gift Giver', 'gift@example.com');

    expect(result?.is_reserved).toBe(true);
    expect(result?.reserved_by_name).toBe('Gift Giver');
    expect(result?.reserved_by_email).toBe('gift@example.com');
    expect(store.items[0].is_reserved).toBe(true);
    expect(store.items[0].reserved_by_name).toBe('Gift Giver');
    expect(store.items[0].reserved_by_email).toBe('gift@example.com');
  });

  it('handles reserveItem error', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.reserveItem).mockResolvedValue({
      data: null,
      error: { message: 'Reserve failed' },
    });

    const store = useWishlistStore();
    store.$patch({ items: [mockItem] });
    const result = await store.reserveItem('wi1', 'Gift Giver', 'gift@example.com');

    expect(result).toBeNull();
    expect(store.items[0].is_reserved).toBe(false);
  });

  // ─── loadHouseholdWishlists ───────────────────────────────

  it('loads household wishlists successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    const householdWishlist = {
      ...mockWishlist,
      id: 'w2',
      user_id: 'u2',
      visibility: 'household' as const,
      title: 'Family Member Wishlist',
    };
    vi.mocked(wishlistService.getHouseholdWishlists).mockResolvedValue({
      data: [householdWishlist],
      error: null,
    });

    const store = useWishlistStore();
    await store.loadHouseholdWishlists('household-1', 'u1');

    // Note: This now includes children's wishlists with household/public visibility
    // even if created by current user (filtered by member_id, not user_id)
    expect(store.householdWishlists).toEqual([householdWishlist]);
  });

  it('handles loadHouseholdWishlists error gracefully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getHouseholdWishlists).mockResolvedValue({
      data: null,
      error: { message: 'Failed to load' },
    });

    const store = useWishlistStore();
    // Seed non-empty initial state to ensure the error handler actually clears it
    store.$patch({
      householdWishlists: [{ ...mockWishlist, id: 'stale-wishlist', title: 'Stale Data' }],
    });

    await store.loadHouseholdWishlists('household-1', 'u1');

    // Verify service was called with correct args
    expect(wishlistService.getHouseholdWishlists).toHaveBeenCalledWith('household-1', 'u1');
    // Should fail silently and set empty array (clearing previous state)
    expect(store.householdWishlists).toEqual([]);
  });

  it('reserves item from household wishlist with authenticated user', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    const householdItem = {
      ...mockItem,
      id: 'wi-household',
      wishlist_id: 'w-household',
    };
    const reservedHouseholdItem = {
      ...householdItem,
      is_reserved: true,
      reserved_by_email: 'member@household.com',
      reserved_by_name: 'Household Member',
    };
    vi.mocked(wishlistService.reserveItem).mockResolvedValue({
      data: reservedHouseholdItem,
      error: null,
    });

    const store = useWishlistStore();
    store.$patch({ items: [householdItem] });
    const result = await store.reserveItem(
      'wi-household',
      'Household Member',
      'member@household.com',
    );

    expect(result?.is_reserved).toBe(true);
    expect(result?.reserved_by_email).toBe('member@household.com');
    expect(store.items[0].is_reserved).toBe(true);
  });

  it('handles reservation error for non-household members', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.reserveItem).mockResolvedValue({
      data: null,
      error: { message: 'You must be a member of this household to reserve items' },
    });

    const store = useWishlistStore();
    store.$patch({ items: [mockItem] });
    const result = await store.reserveItem('wi1', 'Outsider', 'outsider@example.com');

    expect(result).toBeNull();
    expect(store.items[0].is_reserved).toBe(false);
  });

  // ─── Getters ──────────────────────────────────────────────

  it('computes reservedItems and unreservedItems', () => {
    const store = useWishlistStore();
    const reserved = { ...mockItem, id: 'wi2', is_reserved: true, reserved_by_email: 'a@b.com' };
    store.$patch({ items: [mockItem, reserved] });

    expect(store.reservedItems).toEqual([reserved]);
    expect(store.unreservedItems).toEqual([mockItem]);
  });

  it('computes itemsByPriority', () => {
    const store = useWishlistStore();
    const lowItem = { ...mockItem, id: 'wi2', priority: 'low' as const };
    store.$patch({ items: [mockItem, lowItem] });

    expect(store.itemsByPriority['high']).toEqual([mockItem]);
    expect(store.itemsByPriority['low']).toEqual([lowItem]);
  });

  // ─── loadWishlistsByHousehold ─────────────────────────────

  it('loads wishlists by household successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getUserWishlistsByHousehold).mockResolvedValue({
      data: [mockWishlist],
      error: null,
    });

    const store = useWishlistStore();
    await store.loadWishlistsByHousehold('u1', 'h1');

    expect(store.wishlists).toEqual([mockWishlist]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('handles loadWishlistsByHousehold error', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getUserWishlistsByHousehold).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const store = useWishlistStore();
    await store.loadWishlistsByHousehold('u1', 'h1');

    expect(store.wishlists).toEqual([]);
    expect(store.error).toBe('Network error');
  });

  it('prevents stale responses in loadWishlistsByHousehold', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    const wishlist1 = { ...mockWishlist, id: 'w1', title: 'Household 1' };
    const wishlist2 = { ...mockWishlist, id: 'w2', title: 'Household 2' };

    // Set up two requests with different delays
    let resolve1: ((value: { data: (typeof wishlist1)[]; error: null }) => void) | undefined;
    let resolve2: ((value: { data: (typeof wishlist2)[]; error: null }) => void) | undefined;
    const promise1 = new Promise<{ data: (typeof wishlist1)[]; error: null }>((resolve) => {
      resolve1 = resolve;
    });
    const promise2 = new Promise<{ data: (typeof wishlist2)[]; error: null }>((resolve) => {
      resolve2 = resolve;
    });

    vi.mocked(wishlistService.getUserWishlistsByHousehold)
      .mockReturnValueOnce(promise1)
      .mockReturnValueOnce(promise2);

    const store = useWishlistStore();

    // Start first request
    const call1 = store.loadWishlistsByHousehold('u1', 'h1');

    // Start second request (supersedes first)
    const call2 = store.loadWishlistsByHousehold('u1', 'h2');

    // Resolve second request first (latest)
    resolve2!({ data: [wishlist2], error: null });
    await call2;

    // Then resolve first request (stale)
    resolve1!({ data: [wishlist1], error: null });
    await call1;

    // Should only have data from second request (h2), ignoring stale h1 response
    expect(store.wishlists).toEqual([wishlist2]);
  });

  it('handles exception in loadWishlistsByHousehold', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getUserWishlistsByHousehold).mockRejectedValue(
      new Error('Network failure'),
    );

    const store = useWishlistStore();
    await store.loadWishlistsByHousehold('u1', 'h1');

    expect(store.wishlists).toEqual([]);
    expect(store.error).toBe('Network failure');
    expect(store.loading).toBe(false);
  });

  // ─── loadChildrenWishlists ────────────────────────────────

  it('loads children wishlists successfully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    const childWishlist = {
      ...mockWishlist,
      id: 'w3',
      user_id: 'child-1',
      title: "Child's Wishlist",
    };
    vi.mocked(wishlistService.getChildrenWishlists).mockResolvedValue({
      data: [childWishlist],
      error: null,
    });

    const store = useWishlistStore();
    await store.loadChildrenWishlists('u1', 'h1');

    expect(store.childrenWishlists).toEqual([childWishlist]);
  });

  it('handles loadChildrenWishlists error gracefully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getChildrenWishlists).mockResolvedValue({
      data: null,
      error: { message: 'Failed to load' },
    });

    const store = useWishlistStore();
    // Seed non-empty initial state
    store.$patch({
      childrenWishlists: [{ ...mockWishlist, id: 'stale', title: 'Stale' }],
    });

    await store.loadChildrenWishlists('u1', 'h1');

    // Should fail silently and clear state
    expect(store.childrenWishlists).toEqual([]);
  });

  it('handles loadChildrenWishlists exception gracefully', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.getChildrenWishlists).mockRejectedValue(new Error('Network failure'));

    const store = useWishlistStore();
    // Seed non-empty initial state
    store.$patch({
      childrenWishlists: [{ ...mockWishlist, id: 'stale', title: 'Stale' }],
    });

    await store.loadChildrenWishlists('u1', 'h1');

    // Should fail silently and clear state
    expect(store.childrenWishlists).toEqual([]);
  });

  // ─── $reset ───────────────────────────────────────────────

  it('resets store state', () => {
    const store = useWishlistStore();
    store.$patch({
      wishlists: [mockWishlist],
      currentWishlist: mockWishlist,
      items: [mockItem],
      loading: true,
      error: 'Some error',
    });

    store.$reset();

    expect(store.wishlists).toEqual([]);
    expect(store.currentWishlist).toBeNull();
    expect(store.items).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });
});
