import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';

vi.mock('@/features/wishlist/domain/wishlist.service', () => ({
  wishlistService: {
    getUserWishlists: vi.fn(),
    getWishlist: vi.fn(),
    getWishlistBySlug: vi.fn(),
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
  reservation_code: null,
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
    store.wishlists = [mockWishlist];
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
    store.wishlists = [mockWishlist];
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
    store.wishlists = [mockWishlist];
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
    store.wishlists = [mockWishlist];
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
    store.items = [mockItem];
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
    store.items = [mockItem];
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
    store.items = [mockItem];
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
    store.items = [mockItem];
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
      is_public: true,
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
      is_public: true,
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
      reserved_by_name: 'Gift Giver',
      reservation_code: '1234',
    };
    vi.mocked(wishlistService.reserveItem).mockResolvedValue({
      data: reservedItem,
      error: null,
    });

    const store = useWishlistStore();
    store.items = [mockItem];
    const result = await store.reserveItem('wi1', 'Gift Giver');

    expect(result?.item.is_reserved).toBe(true);
    expect(result?.item.reserved_by_name).toBe('Gift Giver');
    expect(result?.code).toBe('1234');
    expect(store.items[0].is_reserved).toBe(true);
    expect(store.items[0].reserved_by_name).toBe('Gift Giver');
  });

  it('handles reserveItem error', async () => {
    const { wishlistService } = await import('@/features/wishlist/domain/wishlist.service');
    vi.mocked(wishlistService.reserveItem).mockResolvedValue({
      data: null,
      error: { message: 'Reserve failed' },
    });

    const store = useWishlistStore();
    store.items = [mockItem];
    const result = await store.reserveItem('wi1', 'Gift Giver');

    expect(result).toBeNull();
    expect(store.items[0].is_reserved).toBe(false);
  });

  // ─── Getters ──────────────────────────────────────────────

  it('computes reservedItems and unreservedItems', () => {
    const store = useWishlistStore();
    const reserved = { ...mockItem, id: 'wi2', is_reserved: true, reserved_by_email: 'a@b.com' };
    store.items = [mockItem, reserved];

    expect(store.reservedItems).toEqual([reserved]);
    expect(store.unreservedItems).toEqual([mockItem]);
  });

  it('computes itemsByPriority', () => {
    const store = useWishlistStore();
    const lowItem = { ...mockItem, id: 'wi2', priority: 'low' as const };
    store.items = [mockItem, lowItem];

    expect(store.itemsByPriority['high']).toEqual([mockItem]);
    expect(store.itemsByPriority['low']).toEqual([lowItem]);
  });
});
