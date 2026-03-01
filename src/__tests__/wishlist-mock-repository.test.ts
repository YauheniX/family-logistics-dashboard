import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryAdapter } from '@/features/shared/infrastructure/mock-storage.adapter';
import type { StorageAdapter } from '@/features/shared/infrastructure/mock-storage.adapter';
import {
  MockWishlistRepository,
  MockWishlistItemRepository,
} from '@/features/wishlist/infrastructure/wishlist.mock-repository';

class TestWishlistRepo extends MockWishlistRepository {
  constructor(storage: StorageAdapter) {
    super();
    (this as unknown as { storage: StorageAdapter }).storage = storage;
  }
}

class TestWishlistItemRepo extends MockWishlistItemRepository {
  constructor(storage: StorageAdapter) {
    super();
    (this as unknown as { storage: StorageAdapter }).storage = storage;
  }
}

describe('MockWishlistRepository', () => {
  let storage: InMemoryAdapter;
  let repo: TestWishlistRepo;

  beforeEach(async () => {
    storage = new InMemoryAdapter();
    await storage.clear();
    repo = new TestWishlistRepo(storage);
  });

  describe('findByUserId', () => {
    it('should filter wishlists by user_id', async () => {
      await repo.create({ title: 'Birthday', description: null, user_id: 'u1' } as any);
      await repo.create({ title: 'Xmas', description: null, user_id: 'u2' } as any);
      await repo.create({ title: 'Holiday', description: null, user_id: 'u1' } as any);

      const result = await repo.findByUserId('u1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data!.every((w) => w.user_id === 'u1')).toBe(true);
    });

    it('should return empty array when no match', async () => {
      await repo.create({ title: 'Birthday', description: null, user_id: 'u1' } as any);

      const result = await repo.findByUserId('no-match');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('should sort by created_at descending (newest first)', async () => {
      vi.useFakeTimers();

      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      await repo.create({ title: 'Oldest', description: null, user_id: 'u1' } as any);

      vi.setSystemTime(new Date('2024-03-01T00:00:00.000Z'));
      await repo.create({ title: 'Newest', description: null, user_id: 'u1' } as any);

      vi.setSystemTime(new Date('2024-02-01T00:00:00.000Z'));
      await repo.create({ title: 'Middle', description: null, user_id: 'u1' } as any);

      const result = await repo.findByUserId('u1');

      expect(result.data).toHaveLength(3);
      expect(result.data![0].title).toBe('Newest');
      expect(result.data![1].title).toBe('Middle');
      expect(result.data![2].title).toBe('Oldest');

      vi.useRealTimers();
    });
  });

  describe('findByUserIdAndHouseholdId', () => {
    it('should filter by both user_id and household_id', async () => {
      await repo.create({ title: 'A', description: null, user_id: 'u1', household_id: 'h1' } as any);
      await repo.create({ title: 'B', description: null, user_id: 'u1', household_id: 'h2' } as any);
      await repo.create({ title: 'C', description: null, user_id: 'u2', household_id: 'h1' } as any);
      await repo.create({ title: 'D', description: null, user_id: 'u1', household_id: 'h1' } as any);

      const result = await repo.findByUserIdAndHouseholdId('u1', 'h1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data!.every((w) => w.user_id === 'u1' && w.household_id === 'h1')).toBe(true);
    });

    it('should return empty array when no match', async () => {
      await repo.create({ title: 'A', description: null, user_id: 'u1', household_id: 'h1' } as any);

      const result = await repo.findByUserIdAndHouseholdId('u1', 'no-match');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('should sort by created_at descending', async () => {
      vi.useFakeTimers();

      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      await repo.create({ title: 'Oldest', description: null, user_id: 'u1', household_id: 'h1' } as any);

      vi.setSystemTime(new Date('2024-03-01T00:00:00.000Z'));
      await repo.create({ title: 'Newest', description: null, user_id: 'u1', household_id: 'h1' } as any);

      const result = await repo.findByUserIdAndHouseholdId('u1', 'h1');

      expect(result.data![0].title).toBe('Newest');
      expect(result.data![1].title).toBe('Oldest');

      vi.useRealTimers();
    });
  });

  describe('findBySlug', () => {
    it('should find wishlist by share_slug with public visibility', async () => {
      await repo.create({ title: 'Public', description: null, share_slug: 'slug1', visibility: 'public', is_public: false } as any);

      const result = await repo.findBySlug('slug1');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.title).toBe('Public');
    });

    it('should find wishlist by share_slug with is_public true', async () => {
      await repo.create({ title: 'IsPublic', description: null, share_slug: 'slug2', visibility: 'private', is_public: true } as any);

      const result = await repo.findBySlug('slug2');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.title).toBe('IsPublic');
    });

    it('should return error when slug not found', async () => {
      const result = await repo.findBySlug('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.message).toBe('Wishlist not found');
    });

    it('should return error when wishlist is private', async () => {
      await repo.create({ title: 'Private', description: null, share_slug: 'slug3', visibility: 'private', is_public: false } as any);

      const result = await repo.findBySlug('slug3');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.message).toBe('Wishlist not found');
    });
  });

  describe('findByHouseholdId', () => {
    it('should filter by household_id and exclude specified user', async () => {
      await repo.create({ title: 'Mine', description: null, user_id: 'u1', household_id: 'h1', visibility: 'household' } as any);
      await repo.create({ title: 'Theirs', description: null, user_id: 'u2', household_id: 'h1', visibility: 'household' } as any);
      await repo.create({ title: 'Other HH', description: null, user_id: 'u3', household_id: 'h2', visibility: 'household' } as any);

      const result = await repo.findByHouseholdId('h1', 'u1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].title).toBe('Theirs');
    });

    it('should only return household or public visibility', async () => {
      await repo.create({ title: 'Household', description: null, user_id: 'u2', household_id: 'h1', visibility: 'household' } as any);
      await repo.create({ title: 'Public', description: null, user_id: 'u2', household_id: 'h1', visibility: 'public' } as any);
      await repo.create({ title: 'Private', description: null, user_id: 'u2', household_id: 'h1', visibility: 'private' } as any);

      const result = await repo.findByHouseholdId('h1', 'u1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      const titles = result.data!.map((w) => w.title);
      expect(titles).toContain('Household');
      expect(titles).toContain('Public');
      expect(titles).not.toContain('Private');
    });

    it('should return empty when no matching wishlists', async () => {
      const result = await repo.findByHouseholdId('h1', 'u1');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('should sort by created_at descending', async () => {
      vi.useFakeTimers();

      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      await repo.create({ title: 'Oldest', description: null, user_id: 'u2', household_id: 'h1', visibility: 'public' } as any);

      vi.setSystemTime(new Date('2024-03-01T00:00:00.000Z'));
      await repo.create({ title: 'Newest', description: null, user_id: 'u2', household_id: 'h1', visibility: 'public' } as any);

      const result = await repo.findByHouseholdId('h1', 'u1');

      expect(result.data![0].title).toBe('Newest');
      expect(result.data![1].title).toBe('Oldest');

      vi.useRealTimers();
    });
  });

  describe('findChildrenWishlists', () => {
    it('should filter by userId and householdId', async () => {
      await repo.create({ title: 'Child A', description: null, user_id: 'child1', household_id: 'h1' } as any);
      await repo.create({ title: 'Child B', description: null, user_id: 'child1', household_id: 'h2' } as any);
      await repo.create({ title: 'Other', description: null, user_id: 'child2', household_id: 'h1' } as any);

      const result = await repo.findChildrenWishlists('child1', 'h1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].title).toBe('Child A');
    });

    it('should return empty when no match', async () => {
      const result = await repo.findChildrenWishlists('child1', 'h1');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });
  });
});

describe('MockWishlistItemRepository', () => {
  let storage: InMemoryAdapter;
  let repo: TestWishlistItemRepo;

  beforeEach(async () => {
    storage = new InMemoryAdapter();
    await storage.clear();
    repo = new TestWishlistItemRepo(storage);
  });

  describe('findByWishlistId', () => {
    it('should filter items by wishlist_id', async () => {
      await repo.create({ wishlist_id: 'w1', title: 'Book', description: null, link: null, price: 10, currency: 'USD', priority: 'medium' } as any);
      await repo.create({ wishlist_id: 'w2', title: 'Game', description: null, link: null, price: 20, currency: 'USD', priority: 'low' } as any);
      await repo.create({ wishlist_id: 'w1', title: 'Toy', description: null, link: null, price: 15, currency: 'USD', priority: 'high' } as any);

      const result = await repo.findByWishlistId('w1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data!.every((i) => i.wishlist_id === 'w1')).toBe(true);
    });

    it('should return empty array when no matching items', async () => {
      await repo.create({ wishlist_id: 'w1', title: 'Book', description: null, link: null, price: 10, currency: 'USD', priority: 'medium' } as any);

      const result = await repo.findByWishlistId('no-match');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('should sort by created_at ascending (oldest first)', async () => {
      vi.useFakeTimers();

      vi.setSystemTime(new Date('2024-03-01T00:00:00.000Z'));
      await repo.create({ wishlist_id: 'w1', title: 'Newest', description: null, link: null, price: 10, currency: 'USD', priority: 'medium' } as any);

      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      await repo.create({ wishlist_id: 'w1', title: 'Oldest', description: null, link: null, price: 10, currency: 'USD', priority: 'medium' } as any);

      vi.setSystemTime(new Date('2024-02-01T00:00:00.000Z'));
      await repo.create({ wishlist_id: 'w1', title: 'Middle', description: null, link: null, price: 10, currency: 'USD', priority: 'medium' } as any);

      const result = await repo.findByWishlistId('w1');

      expect(result.data).toHaveLength(3);
      expect(result.data![0].title).toBe('Oldest');
      expect(result.data![1].title).toBe('Middle');
      expect(result.data![2].title).toBe('Newest');

      vi.useRealTimers();
    });

    it('should handle items with missing created_at dates', async () => {
      const records = [
        { id: 'a', wishlist_id: 'w1', title: 'No Date A' },
        { id: 'b', wishlist_id: 'w1', title: 'Has Date', created_at: '2024-06-01T00:00:00.000Z' },
        { id: 'c', wishlist_id: 'w1', title: 'No Date B' },
      ];
      await storage.set('table:mock_wishlist_items', records);

      const result = await repo.findByWishlistId('w1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(3);
      // Items without created_at get timestamp 0, so they come first (ascending)
      expect(result.data![2].title).toBe('Has Date');
    });
  });

  describe('reserveItem', () => {
    it('should reserve an item', async () => {
      const created = await repo.create({ wishlist_id: 'w1', title: 'Book', description: null, link: null, price: 10, currency: 'USD', priority: 'medium' } as any);
      const itemId = created.data!.id;

      const result = await repo.reserveItem(itemId, {
        is_reserved: true,
        reserved_by_email: 'alice@example.com',
        reserved_by_name: 'Alice',
      });

      expect(result.error).toBeNull();
      expect(result.data!.is_reserved).toBe(true);
      expect(result.data!.reserved_by_email).toBe('alice@example.com');
      expect(result.data!.reserved_by_name).toBe('Alice');
      expect(result.data!.reserved_at).not.toBeNull();
    });

    it('should unreserve an item with matching email', async () => {
      const created = await repo.create({ wishlist_id: 'w1', title: 'Book', description: null, link: null, price: 10, currency: 'USD', priority: 'medium' } as any);
      const itemId = created.data!.id;

      await repo.reserveItem(itemId, {
        is_reserved: true,
        reserved_by_email: 'alice@example.com',
        reserved_by_name: 'Alice',
      });

      const result = await repo.reserveItem(itemId, {
        is_reserved: false,
        reserved_by_email: 'alice@example.com',
        reserved_by_name: null,
      });

      expect(result.error).toBeNull();
      expect(result.data!.is_reserved).toBe(false);
      expect(result.data!.reserved_by_email).toBeNull();
      expect(result.data!.reserved_by_name).toBeNull();
      expect(result.data!.reserved_at).toBeNull();
    });

    it('should return error when id not found', async () => {
      const result = await repo.reserveItem('nonexistent', {
        is_reserved: true,
        reserved_by_email: 'alice@example.com',
        reserved_by_name: 'Alice',
      });

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.message).toContain('not found');
    });

    it('should return error when unreserving with mismatched email', async () => {
      const created = await repo.create({ wishlist_id: 'w1', title: 'Book', description: null, link: null, price: 10, currency: 'USD', priority: 'medium' } as any);
      const itemId = created.data!.id;

      await repo.reserveItem(itemId, {
        is_reserved: true,
        reserved_by_email: 'alice@example.com',
        reserved_by_name: 'Alice',
      });

      const result = await repo.reserveItem(itemId, {
        is_reserved: false,
        reserved_by_email: 'bob@example.com',
        reserved_by_name: null,
      });

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.message).toBe('Email does not match the reservation');
    });

    it('should return error when unreserving without providing email', async () => {
      const created = await repo.create({ wishlist_id: 'w1', title: 'Book', description: null, link: null, price: 10, currency: 'USD', priority: 'medium' } as any);
      const itemId = created.data!.id;

      await repo.reserveItem(itemId, {
        is_reserved: true,
        reserved_by_email: 'alice@example.com',
        reserved_by_name: 'Alice',
      });

      const result = await repo.reserveItem(itemId, {
        is_reserved: false,
        reserved_by_email: null,
        reserved_by_name: null,
      });

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.message).toBe('Email does not match the reservation');
    });

    it('should persist reservation changes', async () => {
      const created = await repo.create({ wishlist_id: 'w1', title: 'Book', description: null, link: null, price: 10, currency: 'USD', priority: 'medium' } as any);
      const itemId = created.data!.id;

      await repo.reserveItem(itemId, {
        is_reserved: true,
        reserved_by_email: 'alice@example.com',
        reserved_by_name: 'Alice',
      });

      // Verify persistence by reading back
      const items = await repo.findByWishlistId('w1');
      expect(items.data).toHaveLength(1);
      expect(items.data![0].is_reserved).toBe(true);
      expect(items.data![0].reserved_by_email).toBe('alice@example.com');
    });
  });
});
