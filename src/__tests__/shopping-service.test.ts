import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShoppingService } from '@/features/shopping/domain/shopping.service';

vi.mock('@/features/shopping/infrastructure/shopping.factory', () => ({
  shoppingListRepository: {
    findByHouseholdId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  shoppingItemRepository: {
    findByListId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockList = {
  id: 'l1',
  household_id: 'h1',
  title: 'Groceries',
  description: null,
  created_by: 'u1',
  created_at: '2024-01-01T00:00:00Z',
  status: 'active' as const,
};

const mockItem = {
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

describe('ShoppingService', () => {
  let service: ShoppingService;

  beforeEach(() => {
    service = new ShoppingService();
    vi.clearAllMocks();
  });

  // ─── getHouseholdLists ──────────────────────────────────

  it('returns lists for a household', async () => {
    const { shoppingListRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingListRepository.findByHouseholdId).mockResolvedValue({
      data: [mockList],
      error: null,
    });

    const result = await service.getHouseholdLists('h1');

    expect(shoppingListRepository.findByHouseholdId).toHaveBeenCalledWith('h1');
    expect(result.data).toEqual([mockList]);
    expect(result.error).toBeNull();
  });

  it('handles getHouseholdLists error', async () => {
    const { shoppingListRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingListRepository.findByHouseholdId).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const result = await service.getHouseholdLists('h1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Network error' });
  });

  // ─── getList ────────────────────────────────────────────

  it('returns a single list by id', async () => {
    const { shoppingListRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingListRepository.findById).mockResolvedValue({
      data: mockList,
      error: null,
    });

    const result = await service.getList('l1');

    expect(shoppingListRepository.findById).toHaveBeenCalledWith('l1');
    expect(result.data).toEqual(mockList);
    expect(result.error).toBeNull();
  });

  it('handles getList error', async () => {
    const { shoppingListRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingListRepository.findById).mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const result = await service.getList('l1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Not found' });
  });

  // ─── createList ─────────────────────────────────────────

  it('creates a list successfully', async () => {
    const { shoppingListRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingListRepository.create).mockResolvedValue({
      data: mockList,
      error: null,
    });

    const dto = { household_id: 'h1', title: 'Groceries', description: null };
    const result = await service.createList(dto);

    expect(shoppingListRepository.create).toHaveBeenCalledWith(dto);
    expect(result.data).toEqual(mockList);
    expect(result.error).toBeNull();
  });

  it('handles createList error', async () => {
    const { shoppingListRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingListRepository.create).mockResolvedValue({
      data: null,
      error: { message: 'Creation failed' },
    });

    const result = await service.createList({
      household_id: 'h1',
      title: 'Groceries',
      description: null,
    });

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Creation failed' });
  });

  // ─── updateList ─────────────────────────────────────────

  it('updates a list successfully', async () => {
    const { shoppingListRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    const updated = { ...mockList, title: 'Updated List' };
    vi.mocked(shoppingListRepository.update).mockResolvedValue({
      data: updated,
      error: null,
    });

    const result = await service.updateList('l1', { title: 'Updated List' });

    expect(shoppingListRepository.update).toHaveBeenCalledWith('l1', { title: 'Updated List' });
    expect(result.data).toEqual(updated);
    expect(result.error).toBeNull();
  });

  it('handles updateList error', async () => {
    const { shoppingListRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingListRepository.update).mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    });

    const result = await service.updateList('l1', { title: 'Updated List' });

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Update failed' });
  });

  // ─── archiveList ────────────────────────────────────────

  it('archives a list by setting status to archived', async () => {
    const { shoppingListRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    const archivedList = { ...mockList, status: 'archived' as const };
    vi.mocked(shoppingListRepository.update).mockResolvedValue({
      data: archivedList,
      error: null,
    });

    const result = await service.archiveList('l1');

    expect(shoppingListRepository.update).toHaveBeenCalledWith('l1', { status: 'archived' });
    expect(result.data).toEqual(archivedList);
    expect(result.data?.status).toBe('archived');
  });

  it('handles archiveList error', async () => {
    const { shoppingListRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingListRepository.update).mockResolvedValue({
      data: null,
      error: { message: 'Archive failed' },
    });

    const result = await service.archiveList('l1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Archive failed' });
  });

  // ─── deleteList ─────────────────────────────────────────

  it('deletes a list successfully', async () => {
    const { shoppingListRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingListRepository.delete).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const result = await service.deleteList('l1');

    expect(shoppingListRepository.delete).toHaveBeenCalledWith('l1');
    expect(result.error).toBeNull();
  });

  it('handles deleteList error', async () => {
    const { shoppingListRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingListRepository.delete).mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    });

    const result = await service.deleteList('l1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Delete failed' });
  });

  // ─── getListItems ───────────────────────────────────────

  it('returns items for a list', async () => {
    const { shoppingItemRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingItemRepository.findByListId).mockResolvedValue({
      data: [mockItem],
      error: null,
    });

    const result = await service.getListItems('l1');

    expect(shoppingItemRepository.findByListId).toHaveBeenCalledWith('l1');
    expect(result.data).toEqual([mockItem]);
    expect(result.error).toBeNull();
  });

  it('handles getListItems error', async () => {
    const { shoppingItemRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingItemRepository.findByListId).mockResolvedValue({
      data: null,
      error: { message: 'Load failed' },
    });

    const result = await service.getListItems('l1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Load failed' });
  });

  // ─── addItem ────────────────────────────────────────────

  it('adds an item successfully', async () => {
    const { shoppingItemRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingItemRepository.create).mockResolvedValue({
      data: mockItem,
      error: null,
    });

    const dto = { list_id: 'l1', title: 'Milk', quantity: 2, category: 'Dairy' };
    const result = await service.addItem(dto);

    expect(shoppingItemRepository.create).toHaveBeenCalledWith(dto);
    expect(result.data).toEqual(mockItem);
    expect(result.error).toBeNull();
  });

  it('handles addItem error', async () => {
    const { shoppingItemRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingItemRepository.create).mockResolvedValue({
      data: null,
      error: { message: 'Add failed' },
    });

    const result = await service.addItem({
      list_id: 'l1',
      title: 'Milk',
      quantity: 2,
      category: 'Dairy',
    });

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Add failed' });
  });

  // ─── updateItem ─────────────────────────────────────────

  it('updates an item successfully', async () => {
    const { shoppingItemRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    const updated = { ...mockItem, title: 'Updated Milk', quantity: 3 };
    vi.mocked(shoppingItemRepository.update).mockResolvedValue({
      data: updated,
      error: null,
    });

    const result = await service.updateItem('i1', { title: 'Updated Milk', quantity: 3 });

    expect(shoppingItemRepository.update).toHaveBeenCalledWith('i1', {
      title: 'Updated Milk',
      quantity: 3,
    });
    expect(result.data).toEqual(updated);
    expect(result.error).toBeNull();
  });

  it('handles updateItem error', async () => {
    const { shoppingItemRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingItemRepository.update).mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    });

    const result = await service.updateItem('i1', { title: 'Updated Milk' });

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Update failed' });
  });

  // ─── togglePurchased ────────────────────────────────────

  it('toggles an unpurchased item to purchased', async () => {
    const { shoppingItemRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    const purchasedItem = { ...mockItem, is_purchased: true, purchased_by: 'u1' };

    vi.mocked(shoppingItemRepository.findById).mockResolvedValue({
      data: { ...mockItem, is_purchased: false },
      error: null,
    });
    vi.mocked(shoppingItemRepository.update).mockResolvedValue({
      data: purchasedItem,
      error: null,
    });

    const result = await service.togglePurchased('i1', 'u1');

    expect(shoppingItemRepository.findById).toHaveBeenCalledWith('i1');
    expect(shoppingItemRepository.update).toHaveBeenCalledWith('i1', {
      is_purchased: true,
      purchased_by: 'u1',
    });
    expect(result.data).toEqual(purchasedItem);
  });

  it('toggles a purchased item to unpurchased', async () => {
    const { shoppingItemRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    const unpurchasedItem = { ...mockItem, is_purchased: false, purchased_by: null };

    vi.mocked(shoppingItemRepository.findById).mockResolvedValue({
      data: { ...mockItem, is_purchased: true, purchased_by: 'u1' },
      error: null,
    });
    vi.mocked(shoppingItemRepository.update).mockResolvedValue({
      data: unpurchasedItem,
      error: null,
    });

    const result = await service.togglePurchased('i1', 'u1');

    expect(shoppingItemRepository.update).toHaveBeenCalledWith('i1', {
      is_purchased: false,
      purchased_by: null,
    });
    expect(result.data).toEqual(unpurchasedItem);
    expect(result.data?.purchased_by).toBeNull();
  });

  it('returns error when findById fails during togglePurchased', async () => {
    const { shoppingItemRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingItemRepository.findById).mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const result = await service.togglePurchased('i1', 'u1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Not found' });
    expect(shoppingItemRepository.update).not.toHaveBeenCalled();
  });

  it('handles togglePurchased update error', async () => {
    const { shoppingItemRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingItemRepository.findById).mockResolvedValue({
      data: mockItem,
      error: null,
    });
    vi.mocked(shoppingItemRepository.update).mockResolvedValue({
      data: null,
      error: { message: 'Toggle failed' },
    });

    const result = await service.togglePurchased('i1', 'u1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Toggle failed' });
  });

  // ─── deleteItem ─────────────────────────────────────────

  it('deletes an item successfully', async () => {
    const { shoppingItemRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingItemRepository.delete).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const result = await service.deleteItem('i1');

    expect(shoppingItemRepository.delete).toHaveBeenCalledWith('i1');
    expect(result.error).toBeNull();
  });

  it('handles deleteItem error', async () => {
    const { shoppingItemRepository } =
      await import('@/features/shopping/infrastructure/shopping.factory');
    vi.mocked(shoppingItemRepository.delete).mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    });

    const result = await service.deleteItem('i1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'Delete failed' });
  });
});
