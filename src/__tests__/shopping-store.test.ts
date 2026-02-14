import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';

vi.mock('@/features/shopping/domain/shopping.service', () => ({
  shoppingService: {
    getFamilyLists: vi.fn(),
    getList: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    archiveList: vi.fn(),
    deleteList: vi.fn(),
    getListItems: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    togglePurchased: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

const mockList = {
  id: 'l1',
  family_id: 'f1',
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

describe('Shopping Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with default state', () => {
    const store = useShoppingStore();
    expect(store.lists).toEqual([]);
    expect(store.currentList).toBeNull();
    expect(store.items).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  // ─── loadLists ────────────────────────────────────────────

  it('loads lists successfully', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.getFamilyLists).mockResolvedValue({
      data: [mockList],
      error: null,
    });

    const store = useShoppingStore();
    await store.loadLists('f1');

    expect(store.lists).toEqual([mockList]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('handles loadLists error', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.getFamilyLists).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const store = useShoppingStore();
    await store.loadLists('f1');

    expect(store.lists).toEqual([]);
    expect(store.error).toBe('Network error');
  });

  // ─── createList ───────────────────────────────────────────

  it('creates a list successfully', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.createList).mockResolvedValue({
      data: mockList,
      error: null,
    });

    const store = useShoppingStore();
    const result = await store.createList({
      family_id: 'f1',
      title: 'Groceries',
      description: null,
    });

    expect(result).toEqual(mockList);
    expect(store.lists).toContainEqual(mockList);
    expect(store.loading).toBe(false);
  });

  it('handles createList error', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.createList).mockResolvedValue({
      data: null,
      error: { message: 'Creation failed' },
    });

    const store = useShoppingStore();
    const result = await store.createList({
      family_id: 'f1',
      title: 'Groceries',
      description: null,
    });

    expect(result).toBeNull();
    expect(store.lists).toEqual([]);
  });

  // ─── loadList ──────────────────────────────────────────────

  it('loads a single list successfully', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.getList).mockResolvedValue({
      data: mockList,
      error: null,
    });
    vi.mocked(shoppingService.getListItems).mockResolvedValue({
      data: [mockItem],
      error: null,
    });

    const store = useShoppingStore();
    await store.loadList('l1');

    expect(store.currentList).toEqual(mockList);
    expect(store.items).toEqual([mockItem]);
    expect(store.loading).toBe(false);
  });

  it('handles loadList error', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.getList).mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    const store = useShoppingStore();
    await store.loadList('l1');

    expect(store.currentList).toBeNull();
    expect(store.error).toBe('Not found');
    expect(store.loading).toBe(false);
  });

  // ─── updateList ───────────────────────────────────────────

  it('updates a list successfully', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    const updated = { ...mockList, title: 'Updated List' };
    vi.mocked(shoppingService.updateList).mockResolvedValue({
      data: updated,
      error: null,
    });

    const store = useShoppingStore();
    store.lists = [mockList];
    const result = await store.updateList('l1', { title: 'Updated List' });

    expect(result).toEqual(updated);
    expect(store.lists[0].title).toBe('Updated List');
    expect(store.currentList).toEqual(updated);
  });

  it('handles updateList error', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.updateList).mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    });

    const store = useShoppingStore();
    store.lists = [mockList];
    const result = await store.updateList('l1', { title: 'Updated List' });

    expect(result).toBeNull();
    expect(store.lists[0].title).toBe('Groceries');
  });

  // ─── removeList ───────────────────────────────────────────

  it('removes a list successfully', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.deleteList).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const store = useShoppingStore();
    store.lists = [mockList];
    await store.removeList('l1');

    expect(store.lists).toEqual([]);
  });

  it('handles removeList error', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.deleteList).mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    });

    const store = useShoppingStore();
    store.lists = [mockList];
    await store.removeList('l1');

    expect(store.lists).toContainEqual(mockList);
  });

  // ─── loadItems ────────────────────────────────────────────

  it('loads items successfully', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.getListItems).mockResolvedValue({
      data: [mockItem],
      error: null,
    });

    const store = useShoppingStore();
    await store.loadItems('l1');

    expect(store.items).toEqual([mockItem]);
  });

  it('handles loadItems error', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.getListItems).mockResolvedValue({
      data: null,
      error: { message: 'Load failed' },
    });

    const store = useShoppingStore();
    await store.loadItems('l1');

    expect(store.items).toEqual([]);
  });

  // ─── addItem ──────────────────────────────────────────────

  it('adds an item successfully', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.addItem).mockResolvedValue({
      data: mockItem,
      error: null,
    });

    const store = useShoppingStore();
    const result = await store.addItem({
      list_id: 'l1',
      title: 'Milk',
      quantity: 2,
      category: 'Dairy',
    });

    expect(result).toEqual(mockItem);
    expect(store.items).toContainEqual(mockItem);
  });

  it('handles addItem error', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.addItem).mockResolvedValue({
      data: null,
      error: { message: 'Add failed' },
    });

    const store = useShoppingStore();
    const result = await store.addItem({
      list_id: 'l1',
      title: 'Milk',
      quantity: 2,
      category: 'Dairy',
    });

    expect(result).toBeNull();
    expect(store.items).toEqual([]);
  });

  // ─── updateItem ─────────────────────────────────────────────

  it('updates an item successfully', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    const updated = { ...mockItem, title: 'Updated Milk', quantity: 3 };
    vi.mocked(shoppingService.updateItem).mockResolvedValue({
      data: updated,
      error: null,
    });

    const store = useShoppingStore();
    store.items = [mockItem];
    const result = await store.updateItem('i1', { title: 'Updated Milk', quantity: 3 });

    expect(result).toEqual(updated);
    expect(store.items[0].title).toBe('Updated Milk');
  });

  it('handles updateItem error', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.updateItem).mockResolvedValue({
      data: null,
      error: { message: 'Update failed' },
    });

    const store = useShoppingStore();
    store.items = [mockItem];
    const result = await store.updateItem('i1', { title: 'Updated Milk' });

    expect(result).toBeNull();
    expect(store.items[0].title).toBe('Milk');
  });

  // ─── removeItem ───────────────────────────────────────────

  it('removes an item successfully', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.deleteItem).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const store = useShoppingStore();
    store.items = [mockItem];
    await store.removeItem('i1');

    expect(store.items).toEqual([]);
  });

  it('handles removeItem error', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.deleteItem).mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    });

    const store = useShoppingStore();
    store.items = [mockItem];
    await store.removeItem('i1');

    expect(store.items).toContainEqual(mockItem);
  });

  // ─── togglePurchased ──────────────────────────────────────

  it('toggles purchased status successfully', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    const purchasedItem = { ...mockItem, is_purchased: true, purchased_by: 'u1' };
    vi.mocked(shoppingService.togglePurchased).mockResolvedValue({
      data: purchasedItem,
      error: null,
    });

    const store = useShoppingStore();
    store.items = [mockItem];
    const result = await store.togglePurchased('i1', 'u1');

    expect(result).toEqual(purchasedItem);
    expect(store.items[0].is_purchased).toBe(true);
  });

  it('handles togglePurchased error', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.togglePurchased).mockResolvedValue({
      data: null,
      error: { message: 'Toggle failed' },
    });

    const store = useShoppingStore();
    store.items = [mockItem];
    const result = await store.togglePurchased('i1', 'u1');

    expect(result).toBeNull();
    expect(store.items[0].is_purchased).toBe(false);
  });

  // ─── archiveList ──────────────────────────────────────────

  it('archives a list successfully', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    const archivedList = { ...mockList, status: 'archived' as const };
    vi.mocked(shoppingService.archiveList).mockResolvedValue({
      data: archivedList,
      error: null,
    });

    const store = useShoppingStore();
    store.lists = [mockList];
    const result = await store.archiveList('l1');

    expect(result).toEqual(archivedList);
    expect(store.lists[0].status).toBe('archived');
  });

  it('handles archiveList error', async () => {
    const { shoppingService } = await import('@/features/shopping/domain/shopping.service');
    vi.mocked(shoppingService.archiveList).mockResolvedValue({
      data: null,
      error: { message: 'Archive failed' },
    });

    const store = useShoppingStore();
    store.lists = [mockList];
    const result = await store.archiveList('l1');

    expect(result).toBeNull();
    expect(store.lists[0].status).toBe('active');
  });

  // ─── Getters ──────────────────────────────────────────────

  it('computes itemsByCategory', () => {
    const store = useShoppingStore();
    const item2 = { ...mockItem, id: 'i2', category: 'Produce', title: 'Apples' };
    store.items = [mockItem, item2];

    expect(store.itemsByCategory['Dairy']).toEqual([mockItem]);
    expect(store.itemsByCategory['Produce']).toEqual([item2]);
  });

  it('computes purchasedItems and unpurchasedItems', () => {
    const store = useShoppingStore();
    const purchased = { ...mockItem, id: 'i2', is_purchased: true };
    store.items = [mockItem, purchased];

    expect(store.purchasedItems).toEqual([purchased]);
    expect(store.unpurchasedItems).toEqual([mockItem]);
  });
});
