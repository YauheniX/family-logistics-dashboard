import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ShoppingListRepository,
  ShoppingItemRepository,
} from '@/features/shopping/infrastructure/shopping.repository';
import type { ShoppingList, ShoppingItem } from '@/features/shared/domain/entities';

vi.mock('@/features/shared/infrastructure/supabase.client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

const mockList: ShoppingList = {
  id: 'l1',
  household_id: 'h1',
  title: 'Groceries',
  description: null,
  created_by: 'u1',
  created_at: '2024-01-01T00:00:00Z',
  status: 'active' as const,
};

const mockItem: ShoppingItem = {
  id: 'i1',
  list_id: 'l1',
  title: 'Milk',
  quantity: 2,
  category: 'Dairy',
  is_purchased: false,
  added_by: 'u1',
  purchased_by: null,
  created_at: '2024-01-01T00:00:00Z',
};

type ExecuteResponse = { data: unknown | null; error: { message: string } | null };

const mockExecute = (repo: unknown) =>
  vi.spyOn(repo as { execute: (...args: unknown[]) => Promise<unknown> }, 'execute');

describe('ShoppingListRepository', () => {
  let repository: ShoppingListRepository;

  beforeEach(() => {
    vi.restoreAllMocks();
    repository = new ShoppingListRepository();
  });

  describe('findByHouseholdId', () => {
    it('delegates to findAll and returns lists on success', async () => {
      const findAllSpy = vi
        .spyOn(repository, 'findAll')
        .mockResolvedValue({ data: [mockList], error: null });

      const result = await repository.findByHouseholdId('h1');

      expect(result.data).toEqual([mockList]);
      expect(result.error).toBeNull();
      expect(findAllSpy).toHaveBeenCalledTimes(1);
    });

    it('returns error when findAll fails', async () => {
      const findAllSpy = vi
        .spyOn(repository, 'findAll')
        .mockResolvedValue({ data: null, error: { message: 'Query failed' } });

      const result = await repository.findByHouseholdId('h1');

      expect(result.error?.message).toBe('Query failed');
      expect(result.data).toBeNull();
      expect(findAllSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('gets auth user and inserts with created_by on success', async () => {
      const getAuthSpy = vi
        .spyOn(repository as any, 'getAuthenticatedUserId')
        .mockResolvedValue({ data: 'u1', error: null });
      const executeSpy = mockExecute(repository).mockResolvedValue({
        data: mockList,
        error: null,
      } satisfies ExecuteResponse);

      const dto = { title: 'Groceries', description: null, household_id: 'h1' };
      const result = await repository.create(dto);

      expect(getAuthSpy).toHaveBeenCalledTimes(1);
      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockList);
      expect(result.error).toBeNull();
    });

    it('returns error when auth fails', async () => {
      vi.spyOn(repository as any, 'getAuthenticatedUserId').mockResolvedValue({
        data: null,
        error: { message: 'Not authenticated' },
      });

      const dto = { title: 'Groceries', description: null, household_id: 'h1' };
      const result = await repository.create(dto);

      expect(result.error?.message).toBe('Not authenticated');
      expect(result.data).toBeNull();
    });

    it('returns error when insert fails', async () => {
      vi.spyOn(repository as any, 'getAuthenticatedUserId').mockResolvedValue({
        data: 'u1',
        error: null,
      });
      mockExecute(repository).mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      } satisfies ExecuteResponse);

      const dto = { title: 'Groceries', description: null, household_id: 'h1' };
      const result = await repository.create(dto);

      expect(result.error?.message).toBe('Insert failed');
      expect(result.data).toBeNull();
    });
  });
});

describe('ShoppingItemRepository', () => {
  let repository: ShoppingItemRepository;

  beforeEach(() => {
    vi.restoreAllMocks();
    repository = new ShoppingItemRepository();
  });

  describe('findByListId', () => {
    it('delegates to findAll and returns items on success', async () => {
      const findAllSpy = vi
        .spyOn(repository, 'findAll')
        .mockResolvedValue({ data: [mockItem], error: null });

      const result = await repository.findByListId('l1');

      expect(result.data).toEqual([mockItem]);
      expect(result.error).toBeNull();
      expect(findAllSpy).toHaveBeenCalledTimes(1);
    });

    it('returns error when findAll fails', async () => {
      const findAllSpy = vi
        .spyOn(repository, 'findAll')
        .mockResolvedValue({ data: null, error: { message: 'Query failed' } });

      const result = await repository.findByListId('l1');

      expect(result.error?.message).toBe('Query failed');
      expect(result.data).toBeNull();
      expect(findAllSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('gets auth user and inserts with added_by on success', async () => {
      const getAuthSpy = vi
        .spyOn(repository as any, 'getAuthenticatedUserId')
        .mockResolvedValue({ data: 'u1', error: null });
      const executeSpy = mockExecute(repository).mockResolvedValue({
        data: mockItem,
        error: null,
      } satisfies ExecuteResponse);

      const dto = { list_id: 'l1', title: 'Milk', quantity: 2, category: 'Dairy' };
      const result = await repository.create(dto);

      expect(getAuthSpy).toHaveBeenCalledTimes(1);
      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockItem);
      expect(result.error).toBeNull();
    });

    it('returns error when auth fails', async () => {
      vi.spyOn(repository as any, 'getAuthenticatedUserId').mockResolvedValue({
        data: null,
        error: { message: 'Not authenticated' },
      });

      const dto = { list_id: 'l1', title: 'Milk', quantity: 2, category: 'Dairy' };
      const result = await repository.create(dto);

      expect(result.error?.message).toBe('Not authenticated');
      expect(result.data).toBeNull();
    });
  });
});
