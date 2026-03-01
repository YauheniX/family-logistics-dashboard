import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryAdapter } from '@/features/shared/infrastructure/mock-storage.adapter';
import type { StorageAdapter } from '@/features/shared/infrastructure/mock-storage.adapter';
import {
  MockShoppingListRepository,
  MockShoppingItemRepository,
} from '@/features/shopping/infrastructure/shopping.mock-repository';

// Test subclasses that inject InMemoryAdapter for isolation
class TestShoppingListRepo extends MockShoppingListRepository {
  constructor(storage: StorageAdapter) {
    super();
    (this as unknown as { storage: StorageAdapter }).storage = storage;
  }
}

class TestShoppingItemRepo extends MockShoppingItemRepository {
  constructor(storage: StorageAdapter) {
    super();
    (this as unknown as { storage: StorageAdapter }).storage = storage;
  }
}

describe('MockShoppingListRepository', () => {
  let storage: InMemoryAdapter;
  let repo: TestShoppingListRepo;

  beforeEach(async () => {
    storage = new InMemoryAdapter();
    await storage.clear();
    repo = new TestShoppingListRepo(storage);
  });

  describe('findByHouseholdId', () => {
    it('should filter lists by household_id', async () => {
      await repo.create({ household_id: 'h1', title: 'Groceries', description: null });
      await repo.create({ household_id: 'h2', title: 'Hardware', description: null });
      await repo.create({ household_id: 'h1', title: 'Pharmacy', description: null });

      const result = await repo.findByHouseholdId('h1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data!.every((l) => l.household_id === 'h1')).toBe(true);
    });

    it('should return empty array when no matching lists', async () => {
      await repo.create({ household_id: 'h1', title: 'Groceries', description: null });

      const result = await repo.findByHouseholdId('no-match');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('should sort by created_at descending (newest first)', async () => {
      vi.useFakeTimers();

      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      await repo.create({ household_id: 'h1', title: 'Oldest', description: null });

      vi.setSystemTime(new Date('2024-03-01T00:00:00.000Z'));
      await repo.create({ household_id: 'h1', title: 'Newest', description: null });

      vi.setSystemTime(new Date('2024-02-01T00:00:00.000Z'));
      await repo.create({ household_id: 'h1', title: 'Middle', description: null });

      const result = await repo.findByHouseholdId('h1');

      expect(result.data).toHaveLength(3);
      expect(result.data![0].title).toBe('Newest');
      expect(result.data![1].title).toBe('Middle');
      expect(result.data![2].title).toBe('Oldest');

      vi.useRealTimers();
    });

    it('should handle lists with missing created_at dates', async () => {
      // Manually insert records without created_at to exercise the fallback
      const records = [
        { id: 'a', household_id: 'h1', title: 'No Date A' },
        { id: 'b', household_id: 'h1', title: 'Has Date', created_at: '2024-06-01T00:00:00.000Z' },
        { id: 'c', household_id: 'h1', title: 'No Date B' },
      ];
      await storage.set('table:mock_shopping_lists', records);

      const result = await repo.findByHouseholdId('h1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(3);
      // 'Has Date' has the only real timestamp so it should be first (newest)
      expect(result.data![0].title).toBe('Has Date');
    });
  });
});

describe('MockShoppingItemRepository', () => {
  let storage: InMemoryAdapter;
  let repo: TestShoppingItemRepo;

  beforeEach(async () => {
    storage = new InMemoryAdapter();
    await storage.clear();
    repo = new TestShoppingItemRepo(storage);
  });

  describe('findByListId', () => {
    it('should filter items by list_id', async () => {
      await repo.create({ list_id: 'l1', title: 'Milk', quantity: 2, category: 'Dairy' });
      await repo.create({ list_id: 'l2', title: 'Hammer', quantity: 1, category: 'Tools' });
      await repo.create({ list_id: 'l1', title: 'Eggs', quantity: 12, category: 'Dairy' });

      const result = await repo.findByListId('l1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data!.every((i) => i.list_id === 'l1')).toBe(true);
    });

    it('should return empty array when no matching items', async () => {
      await repo.create({ list_id: 'l1', title: 'Milk', quantity: 1, category: 'Dairy' });

      const result = await repo.findByListId('no-match');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('should sort by created_at ascending (oldest first)', async () => {
      vi.useFakeTimers();

      vi.setSystemTime(new Date('2024-03-01T00:00:00.000Z'));
      await repo.create({ list_id: 'l1', title: 'Newest', quantity: 1, category: 'A' });

      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      await repo.create({ list_id: 'l1', title: 'Oldest', quantity: 1, category: 'B' });

      vi.setSystemTime(new Date('2024-02-01T00:00:00.000Z'));
      await repo.create({ list_id: 'l1', title: 'Middle', quantity: 1, category: 'C' });

      const result = await repo.findByListId('l1');

      expect(result.data).toHaveLength(3);
      expect(result.data![0].title).toBe('Oldest');
      expect(result.data![1].title).toBe('Middle');
      expect(result.data![2].title).toBe('Newest');

      vi.useRealTimers();
    });

    it('should handle items with missing created_at dates', async () => {
      const records = [
        { id: 'a', list_id: 'l1', title: 'No Date A' },
        { id: 'b', list_id: 'l1', title: 'Has Date', created_at: '2024-06-01T00:00:00.000Z' },
        { id: 'c', list_id: 'l1', title: 'No Date B' },
      ];
      await storage.set('table:mock_shopping_items', records);

      const result = await repo.findByListId('l1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(3);
      // Items without created_at get timestamp 0, so they come first (ascending)
      expect(result.data![2].title).toBe('Has Date');
    });
  });
});
