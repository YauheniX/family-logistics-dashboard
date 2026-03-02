import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import DashboardView from '@/views/DashboardView.vue';
import { useHouseholdStore } from '@/stores/household';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';
import i18n from '@/i18n';

// Use vi.hoisted so the mock reference is available before vi.mock is hoisted
const { getDashboardSummaryMock } = vi.hoisted(() => ({
  getDashboardSummaryMock: vi.fn().mockResolvedValue({
    data: { shoppingLists: [], myWishlists: [], householdWishlists: [] },
    error: null,
  }),
}));

vi.mock('@/features/shared/infrastructure/dashboard.repository', () => ({
  dashboardRepository: { getDashboardSummary: getDashboardSummaryMock },
}));

// Mock the composables and stores
vi.mock('@/composables/useUserProfile', () => ({
  useUserProfile: () => ({
    userDisplayName: { value: 'Test User' },
    userAvatarUrl: { value: null },
  }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'u1', email: 'test@example.com' },
  }),
}));

vi.mock('@/features/household/presentation/household.store', () => ({
  useHouseholdEntityStore: () => ({
    loading: false,
    households: [],
    loadHouseholds: vi.fn(),
  }),
}));

// Helper to mount DashboardView with consistent setup
async function mountDashboard() {
  const pinia = createPinia();
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/households', component: { template: '<div />' } },
    ],
  });

  setActivePinia(pinia);

  const wrapper = mount(DashboardView, {
    global: {
      plugins: [pinia, router, i18n],
      stubs: {
        RouterLink: true,
        BaseCard: true,
        BaseBadge: true,
        EmptyState: true,
        LoadingState: true,
        PendingInvitationsCard: true,
      },
    },
  });

  const householdStore = useHouseholdStore();
  const shoppingStore = useShoppingStore();
  const wishlistStore = useWishlistStore();

  // IMPORTANT: Set household store as initialized to allow data loading
  // This simulates the completed initialization that happens in App.vue
  householdStore.initialized = true;

  // Wait for initial mount side effects to complete
  await flushPromises();
  await nextTick();

  // Clear any calls from initial mount
  getDashboardSummaryMock.mockClear();

  return { wrapper, householdStore, shoppingStore, wishlistStore };
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDashboardSummaryMock.mockReset().mockResolvedValue({
      data: { shoppingLists: [], myWishlists: [], householdWishlists: [] },
      error: null,
    });
    localStorage.clear();
  });

  describe('Household Switching', () => {
    it('should reload data when household is switched', async () => {
      const { wrapper, householdStore } = await mountDashboard();

      // Simulate switching to household 'h1'
      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      // Verify aggregate was called with the new household ID
      expect(getDashboardSummaryMock).toHaveBeenCalledWith('h1', 'u1');

      // Simulate switching to another household 'h2'
      householdStore.setCurrentHousehold({
        id: 'h2',
        name: 'Household 2',
        slug: 'household-2',
        role: 'member',
      });

      await flushPromises();
      await nextTick();

      // Verify aggregate was called again with the new household ID
      expect(getDashboardSummaryMock).toHaveBeenCalledWith('h2', 'u1');
      expect(getDashboardSummaryMock).toHaveBeenCalledTimes(2);

      wrapper.unmount();
    });

    it('should not reload when household is cleared', async () => {
      const { wrapper, householdStore } = await mountDashboard();

      // Set a household first
      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      expect(getDashboardSummaryMock).toHaveBeenCalledWith('h1', 'u1');

      // Clear the current household
      householdStore.setCurrentHousehold(null);

      await flushPromises();
      await nextTick();

      // aggregate should not be called again (still only 1 call)
      expect(getDashboardSummaryMock).toHaveBeenCalledTimes(1);

      wrapper.unmount();
    });

    it('should handle sequential household switches correctly', async () => {
      const { wrapper, householdStore } = await mountDashboard();

      // Switch to household 1
      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      expect(getDashboardSummaryMock).toHaveBeenCalledWith('h1', 'u1');

      // Switch to household 2
      householdStore.setCurrentHousehold({
        id: 'h2',
        name: 'Household 2',
        slug: 'household-2',
        role: 'member',
      });

      await flushPromises();
      await nextTick();

      expect(getDashboardSummaryMock).toHaveBeenCalledWith('h2', 'u1');

      // Switch to household 3
      householdStore.setCurrentHousehold({
        id: 'h3',
        name: 'Household 3',
        slug: 'household-3',
        role: 'admin',
      });

      await flushPromises();
      await nextTick();

      expect(getDashboardSummaryMock).toHaveBeenCalledWith('h3', 'u1');
      expect(getDashboardSummaryMock).toHaveBeenCalledTimes(3);

      wrapper.unmount();
    });

    it('household switch triggers exactly one aggregate call', async () => {
      const { wrapper, householdStore } = await mountDashboard();

      // Switch to household 'h1'
      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      // The aggregate should be called exactly once with the correct args
      expect(getDashboardSummaryMock).toHaveBeenCalledTimes(1);
      expect(getDashboardSummaryMock).toHaveBeenCalledWith('h1', 'u1');

      wrapper.unmount();
    });

    it('populates store state from aggregate response', async () => {
      const mockLists = [{ id: 'sl1', title: 'Groceries', status: 'active', household_id: 'h1' }];
      const mockMyWishlists = [{ id: 'w1', title: 'Birthday', visibility: 'private' }];
      const mockHouseholdWishlists = [{ id: 'w2', title: 'Christmas', visibility: 'household' }];

      getDashboardSummaryMock.mockResolvedValueOnce({
        data: {
          shoppingLists: mockLists,
          myWishlists: mockMyWishlists,
          householdWishlists: mockHouseholdWishlists,
        },
        error: null,
      });

      const { wrapper, householdStore, shoppingStore, wishlistStore } = await mountDashboard();

      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      expect(shoppingStore.lists).toEqual(mockLists);
      expect(wishlistStore.wishlists).toEqual(mockMyWishlists);
      expect(wishlistStore.householdWishlists).toEqual(mockHouseholdWishlists);

      wrapper.unmount();
    });

    it('clears dashboard collections when aggregate load fails', async () => {
      const { wrapper, householdStore, shoppingStore, wishlistStore } = await mountDashboard();

      shoppingStore.setLists([
        {
          id: 'old-sl',
          household_id: 'old-household',
          title: 'Old List',
          description: null,
          created_by: 'u1',
          created_at: '2024-01-01T00:00:00Z',
          status: 'active',
        },
      ]);
      wishlistStore.setWishlists([
        {
          id: 'old-w1',
          user_id: 'u1',
          title: 'Old Wishlist',
          description: null,
          is_public: false,
          share_slug: 'old-w1-slug',
          created_at: '2024-01-01T00:00:00Z',
          visibility: 'private',
        },
      ]);
      wishlistStore.setHouseholdWishlists([
        {
          id: 'old-w2',
          user_id: 'u2',
          title: 'Old Shared',
          description: null,
          is_public: false,
          share_slug: 'old-w2-slug',
          created_at: '2024-01-01T00:00:00Z',
          visibility: 'household',
        },
      ]);

      getDashboardSummaryMock.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC failed' },
      });

      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      expect(shoppingStore.lists).toEqual([]);
      expect(wishlistStore.wishlists).toEqual([]);
      expect(wishlistStore.householdWishlists).toEqual([]);

      wrapper.unmount();
    });
  });

  describe('Deduplication', () => {
    it('should not duplicate loads when household is already loaded', async () => {
      const { wrapper, householdStore } = await mountDashboard();

      // Switch to household 'h1'
      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      expect(getDashboardSummaryMock).toHaveBeenCalledTimes(1);

      // Setting the same household again should NOT trigger another load
      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      // Still only 1 call - deduplication prevents redundant load
      expect(getDashboardSummaryMock).toHaveBeenCalledTimes(1);

      wrapper.unmount();
    });
  });

  describe('Stale Requests', () => {
    it('should ignore stale request results via token pattern', async () => {
      const { wrapper, householdStore } = await mountDashboard();

      // Simulate a slow aggregate call for household 'h1'
      let resolveH1: (value: unknown) => void = () => {};
      const h1Promise = new Promise((resolve) => {
        resolveH1 = resolve;
      });
      getDashboardSummaryMock.mockImplementationOnce(() => h1Promise);

      // Switch to household h1 (starts slow load)
      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });
      await nextTick();

      // Before h1 finishes, switch to h2 (this invalidates h1's token)
      getDashboardSummaryMock.mockResolvedValueOnce({
        data: { shoppingLists: [], myWishlists: [], householdWishlists: [] },
        error: null,
      });

      householdStore.setCurrentHousehold({
        id: 'h2',
        name: 'Household 2',
        slug: 'household-2',
        role: 'member',
      });

      await flushPromises();
      await nextTick();

      // Now resolve h1's slow response
      resolveH1({
        data: { shoppingLists: [], myWishlists: [], householdWishlists: [] },
        error: null,
      });
      await flushPromises();
      await nextTick();

      // The latest call should be for h2, confirming h1's stale result was superseded
      const lastCall =
        getDashboardSummaryMock.mock.calls[getDashboardSummaryMock.mock.calls.length - 1];
      expect(lastCall[0]).toBe('h2');

      wrapper.unmount();
    });

    it('should reload household A in an A→B→A switch while B is in flight', async () => {
      const { wrapper, householdStore } = await mountDashboard();

      // 1. Load household A (completes successfully)
      householdStore.setCurrentHousehold({
        id: 'hA',
        name: 'Household A',
        slug: 'household-a',
        role: 'owner',
      });
      await flushPromises();
      await nextTick();

      expect(getDashboardSummaryMock).toHaveBeenCalledWith('hA', 'u1');
      getDashboardSummaryMock.mockClear();

      // 2. Switch to household B with a slow response (stays in flight)
      let resolveB: (value: unknown) => void = () => {};
      const bPromise = new Promise((resolve) => {
        resolveB = resolve;
      });
      getDashboardSummaryMock.mockImplementationOnce(() => bPromise);

      householdStore.setCurrentHousehold({
        id: 'hB',
        name: 'Household B',
        slug: 'household-b',
        role: 'member',
      });
      await nextTick();

      // 3. While B is still in flight, switch back to A
      getDashboardSummaryMock.mockResolvedValueOnce({
        data: { shoppingLists: [], myWishlists: [], householdWishlists: [] },
        error: null,
      });

      householdStore.setCurrentHousehold({
        id: 'hA',
        name: 'Household A',
        slug: 'household-a',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      // A must have been re-issued despite being the last *completed* load
      expect(getDashboardSummaryMock).toHaveBeenCalledWith('hA', 'u1');

      // 4. Resolve the stale B response — it should not overwrite A
      resolveB({
        data: { shoppingLists: [], myWishlists: [], householdWishlists: [] },
        error: null,
      });
      await flushPromises();
      await nextTick();

      // The most recent successful call is for A, not B
      const lastCall =
        getDashboardSummaryMock.mock.calls[getDashboardSummaryMock.mock.calls.length - 1];
      expect(lastCall[0]).toBe('hA');

      wrapper.unmount();
    });
  });
});
