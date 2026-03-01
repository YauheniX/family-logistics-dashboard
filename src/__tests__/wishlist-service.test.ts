import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WishlistService } from '@/features/wishlist/domain/wishlist.service';

vi.mock('@/features/wishlist/infrastructure/wishlist.factory', () => ({
  wishlistRepository: {
    findByUserId: vi.fn(),
    findByUserIdAndHouseholdId: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByHouseholdId: vi.fn(),
    findChildrenWishlists: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  wishlistItemRepository: {
    findByWishlistId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reserveItem: vi.fn(),
  },
}));

const mockWishlist = {
  id: 'w1',
  user_id: 'u1',
  household_id: 'h1',
  title: 'Birthday Wishes',
  description: null,
  is_public: false,
  visibility: 'private' as const,
  share_slug: 'abc12345',
  created_at: '2024-01-01T00:00:00Z',
};

const mockItem = {
  id: 'wi1',
  wishlist_id: 'w1',
  title: 'New Book',
  description: null,
  link: null,
  price: 19.99,
  currency: 'USD',
  priority: 'medium' as const,
  is_reserved: false,
  reserved_by_email: null,
  reserved_by_name: null,
  reserved_at: null,
  created_at: '2024-01-01T00:00:00Z',
};

describe('WishlistService', () => {
  let service: WishlistService;

  beforeEach(() => {
    service = new WishlistService();
    vi.clearAllMocks();
  });

  // ─── getUserWishlists ─────────────────────────────────────

  it('returns wishlists for a user', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.findByUserId).mockResolvedValue({
      data: [mockWishlist],
      error: null,
    });

    const result = await service.getUserWishlists('u1');

    expect(wishlistRepository.findByUserId).toHaveBeenCalledWith('u1');
    expect(result.data).toEqual([mockWishlist]);
    expect(result.error).toBeNull();
  });

  it('handles getUserWishlists error', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.findByUserId).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const result = await service.getUserWishlists('u1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Network error' });
  });

  // ─── getUserWishlistsByHousehold ───────────────────────────

  it('returns wishlists for a user in a household', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.findByUserIdAndHouseholdId).mockResolvedValue({
      data: [mockWishlist],
      error: null,
    });

    const result = await service.getUserWishlistsByHousehold('u1', 'h1');

    expect(wishlistRepository.findByUserIdAndHouseholdId).toHaveBeenCalledWith('u1', 'h1');
    expect(result.data).toEqual([mockWishlist]);
    expect(result.error).toBeNull();
  });

  it('handles getUserWishlistsByHousehold error', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.findByUserIdAndHouseholdId).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const result = await service.getUserWishlistsByHousehold('u1', 'h1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Network error' });
  });

  // ─── getWishlist ──────────────────────────────────────────

  it('returns a single wishlist by id', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.findById).mockResolvedValue({
      data: mockWishlist,
      error: null,
    });

    const result = await service.getWishlist('w1');

    expect(wishlistRepository.findById).toHaveBeenCalledWith('w1');
    expect(result.data).toEqual(mockWishlist);
    expect(result.error).toBeNull();
  });

  it('handles getWishlist error', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.findById).mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const result = await service.getWishlist('w1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Not found' });
  });

  // ─── getWishlistBySlug ────────────────────────────────────

  it('returns a wishlist by share slug', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.findBySlug).mockResolvedValue({
      data: mockWishlist,
      error: null,
    });

    const result = await service.getWishlistBySlug('abc12345');

    expect(wishlistRepository.findBySlug).toHaveBeenCalledWith('abc12345');
    expect(result.data).toEqual(mockWishlist);
    expect(result.error).toBeNull();
  });

  it('handles getWishlistBySlug error', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.findBySlug).mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const result = await service.getWishlistBySlug('abc12345');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Not found' });
  });

  // ─── getHouseholdWishlists ────────────────────────────────

  it('returns wishlists for a household excluding a user', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.findByHouseholdId).mockResolvedValue({
      data: [mockWishlist],
      error: null,
    });

    const result = await service.getHouseholdWishlists('h1', 'u2');

    expect(wishlistRepository.findByHouseholdId).toHaveBeenCalledWith('h1', 'u2');
    expect(result.data).toEqual([mockWishlist]);
    expect(result.error).toBeNull();
  });

  it('handles getHouseholdWishlists error', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.findByHouseholdId).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const result = await service.getHouseholdWishlists('h1', 'u2');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Network error' });
  });

  // ─── getChildrenWishlists ─────────────────────────────────

  it('returns children wishlists for a user in a household', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.findChildrenWishlists).mockResolvedValue({
      data: [mockWishlist],
      error: null,
    });

    const result = await service.getChildrenWishlists('u1', 'h1');

    expect(wishlistRepository.findChildrenWishlists).toHaveBeenCalledWith('u1', 'h1');
    expect(result.data).toEqual([mockWishlist]);
    expect(result.error).toBeNull();
  });

  it('handles getChildrenWishlists error', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.findChildrenWishlists).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const result = await service.getChildrenWishlists('u1', 'h1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Network error' });
  });

  // ─── createWishlist ───────────────────────────────────────

  it('creates a wishlist with auto-generated share_slug', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.create).mockResolvedValue({
      data: mockWishlist,
      error: null,
    });

    const dto = { user_id: 'u1', household_id: 'h1', title: 'Birthday Wishes' };
    const result = await service.createWishlist(dto);

    const callArg = vi.mocked(wishlistRepository.create).mock.calls[0][0];
    expect(callArg).toMatchObject(dto);
    expect(callArg.share_slug).toBeDefined();
    expect(callArg.share_slug).toHaveLength(8);
    expect(callArg.share_slug).toMatch(/^[a-z0-9]{8}$/);
    expect(result.data).toEqual(mockWishlist);
    expect(result.error).toBeNull();
  });

  it('handles createWishlist error', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.create).mockResolvedValue({
      data: null,
      error: { message: 'Creation failed' },
    });

    const result = await service.createWishlist({
      user_id: 'u1',
      household_id: 'h1',
      title: 'Birthday Wishes',
    });

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Creation failed' });
  });

  // ─── updateWishlist ───────────────────────────────────────

  it('updates a wishlist successfully', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    const updated = { ...mockWishlist, title: 'Updated Wishes' };
    vi.mocked(wishlistRepository.update).mockResolvedValue({
      data: updated,
      error: null,
    });

    const result = await service.updateWishlist('w1', { title: 'Updated Wishes' });

    expect(wishlistRepository.update).toHaveBeenCalledWith('w1', { title: 'Updated Wishes' });
    expect(result.data).toEqual(updated);
    expect(result.error).toBeNull();
  });

  it('handles updateWishlist error', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.update).mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    });

    const result = await service.updateWishlist('w1', { title: 'Updated Wishes' });

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Update failed' });
  });

  // ─── deleteWishlist ───────────────────────────────────────

  it('deletes a wishlist successfully', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.delete).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const result = await service.deleteWishlist('w1');

    expect(wishlistRepository.delete).toHaveBeenCalledWith('w1');
    expect(result.error).toBeNull();
  });

  it('handles deleteWishlist error', async () => {
    const { wishlistRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistRepository.delete).mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    });

    const result = await service.deleteWishlist('w1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Delete failed' });
  });

  // ─── getWishlistItems ─────────────────────────────────────

  it('returns items for a wishlist', async () => {
    const { wishlistItemRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistItemRepository.findByWishlistId).mockResolvedValue({
      data: [mockItem],
      error: null,
    });

    const result = await service.getWishlistItems('w1');

    expect(wishlistItemRepository.findByWishlistId).toHaveBeenCalledWith('w1');
    expect(result.data).toEqual([mockItem]);
    expect(result.error).toBeNull();
  });

  it('handles getWishlistItems error', async () => {
    const { wishlistItemRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistItemRepository.findByWishlistId).mockResolvedValue({
      data: null,
      error: { message: 'Load failed' },
    });

    const result = await service.getWishlistItems('w1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Load failed' });
  });

  // ─── addItem ──────────────────────────────────────────────

  it('adds an item successfully', async () => {
    const { wishlistItemRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistItemRepository.create).mockResolvedValue({
      data: mockItem,
      error: null,
    });

    const dto = { wishlist_id: 'w1', title: 'New Book', price: 19.99, currency: 'USD', priority: 'medium' as const };
    const result = await service.addItem(dto);

    expect(wishlistItemRepository.create).toHaveBeenCalledWith(dto);
    expect(result.data).toEqual(mockItem);
    expect(result.error).toBeNull();
  });

  it('handles addItem error', async () => {
    const { wishlistItemRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistItemRepository.create).mockResolvedValue({
      data: null,
      error: { message: 'Add failed' },
    });

    const result = await service.addItem({
      wishlist_id: 'w1',
      title: 'New Book',
      price: 19.99,
      currency: 'USD',
      priority: 'medium' as const,
    });

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Add failed' });
  });

  // ─── updateItem ───────────────────────────────────────────

  it('updates an item successfully', async () => {
    const { wishlistItemRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    const updated = { ...mockItem, title: 'Updated Book', price: 24.99 };
    vi.mocked(wishlistItemRepository.update).mockResolvedValue({
      data: updated,
      error: null,
    });

    const result = await service.updateItem('wi1', { title: 'Updated Book', price: 24.99 });

    expect(wishlistItemRepository.update).toHaveBeenCalledWith('wi1', {
      title: 'Updated Book',
      price: 24.99,
    });
    expect(result.data).toEqual(updated);
    expect(result.error).toBeNull();
  });

  it('handles updateItem error', async () => {
    const { wishlistItemRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistItemRepository.update).mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    });

    const result = await service.updateItem('wi1', { title: 'Updated Book' });

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Update failed' });
  });

  // ─── deleteItem ───────────────────────────────────────────

  it('deletes an item successfully', async () => {
    const { wishlistItemRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistItemRepository.delete).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const result = await service.deleteItem('wi1');

    expect(wishlistItemRepository.delete).toHaveBeenCalledWith('wi1');
    expect(result.error).toBeNull();
  });

  it('handles deleteItem error', async () => {
    const { wishlistItemRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistItemRepository.delete).mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    });

    const result = await service.deleteItem('wi1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Delete failed' });
  });

  // ─── reserveItem ──────────────────────────────────────────

  it('reserves an unreserved item', async () => {
    const { wishlistItemRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    const reservedItem = {
      ...mockItem,
      is_reserved: true,
      reserved_by_email: 'friend@example.com',
      reserved_by_name: 'Friend',
    };

    vi.mocked(wishlistItemRepository.findById).mockResolvedValue({
      data: { ...mockItem, is_reserved: false },
      error: null,
    });
    vi.mocked(wishlistItemRepository.reserveItem).mockResolvedValue({
      data: reservedItem,
      error: null,
    });

    const result = await service.reserveItem('wi1', 'Friend', 'friend@example.com');

    expect(wishlistItemRepository.findById).toHaveBeenCalledWith('wi1');
    expect(wishlistItemRepository.reserveItem).toHaveBeenCalledWith('wi1', {
      is_reserved: true,
      reserved_by_email: 'friend@example.com',
      reserved_by_name: 'Friend',
    });
    expect(result.data).toEqual(reservedItem);
    expect(result.error).toBeNull();
  });

  it('unreserves a reserved item', async () => {
    const { wishlistItemRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    const unreservedItem = {
      ...mockItem,
      is_reserved: false,
      reserved_by_email: 'friend@example.com',
      reserved_by_name: null,
    };

    vi.mocked(wishlistItemRepository.findById).mockResolvedValue({
      data: { ...mockItem, is_reserved: true, reserved_by_email: 'friend@example.com', reserved_by_name: 'Friend' },
      error: null,
    });
    vi.mocked(wishlistItemRepository.reserveItem).mockResolvedValue({
      data: unreservedItem,
      error: null,
    });

    const result = await service.reserveItem('wi1', 'Friend', 'friend@example.com');

    expect(wishlistItemRepository.reserveItem).toHaveBeenCalledWith('wi1', {
      is_reserved: false,
      reserved_by_email: 'friend@example.com',
      reserved_by_name: null,
    });
    expect(result.data).toEqual(unreservedItem);
    expect(result.data?.reserved_by_name).toBeNull();
  });

  it('returns error when findById fails during reserveItem', async () => {
    const { wishlistItemRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistItemRepository.findById).mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const result = await service.reserveItem('wi1', 'Friend', 'friend@example.com');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Not found' });
    expect(wishlistItemRepository.reserveItem).not.toHaveBeenCalled();
  });

  it('returns error when reserving with empty email', async () => {
    const { wishlistItemRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistItemRepository.findById).mockResolvedValue({
      data: { ...mockItem, is_reserved: false },
      error: null,
    });

    const result = await service.reserveItem('wi1', 'Friend', '');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Email is required to reserve an item' });
    expect(wishlistItemRepository.reserveItem).not.toHaveBeenCalled();
  });

  it('returns error when reserving with undefined email', async () => {
    const { wishlistItemRepository } = await import(
      '@/features/wishlist/infrastructure/wishlist.factory'
    );
    vi.mocked(wishlistItemRepository.findById).mockResolvedValue({
      data: { ...mockItem, is_reserved: false },
      error: null,
    });

    const result = await service.reserveItem('wi1', 'Friend', undefined);

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Email is required to reserve an item' });
    expect(wishlistItemRepository.reserveItem).not.toHaveBeenCalled();
  });
});
