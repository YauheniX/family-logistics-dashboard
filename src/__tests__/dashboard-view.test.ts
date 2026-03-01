import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import DashboardView from '@/views/DashboardView.vue';
import { useHouseholdStore } from '@/stores/household';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';
import i18n from '@/i18n';

// Shared mock functions for wishlist store
const loadWishlistsByHouseholdMock = vi.fn().mockResolvedValue(undefined);
const loadHouseholdWishlistsMock = vi.fn().mockResolvedValue(undefined);

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

vi.mock('@/features/wishlist/presentation/wishlist.store', () => ({
  useWishlistStore: () => ({
    wishlists: [],
    householdWishlists: [],
    loadWishlistsByHousehold: loadWishlistsByHouseholdMock,
    loadHouseholdWishlists: loadHouseholdWishlistsMock,
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

  // IMPORTANT: Set household store as initialized to allow data loading
  // This simulates the completed initialization that happens in App.vue
  householdStore.initialized = true;

  // Mock loadLists to prevent real service calls
  const loadListsSpy = vi.spyOn(shoppingStore, 'loadLists').mockResolvedValue(undefined);

  // Wait for initial mount side effects to complete
  await flushPromises();
  await nextTick();

  // Clear any calls from initial mount
  loadListsSpy.mockClear();
  loadWishlistsByHouseholdMock.mockClear();
  loadHouseholdWishlistsMock.mockClear();

  return { wrapper, householdStore, shoppingStore, loadListsSpy };
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadWishlistsByHouseholdMock.mockReset().mockResolvedValue(undefined);
    loadHouseholdWishlistsMock.mockReset().mockResolvedValue(undefined);
    localStorage.clear();
  });

  describe('Household Switching', () => {
    it('should reload shopping lists when household is switched', async () => {
      const { wrapper, householdStore, loadListsSpy } = await mountDashboard();

      // Simulate switching to household 'h1'
      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      // Verify loadLists was called with the new household ID
      expect(loadListsSpy).toHaveBeenCalledWith('h1');

      // Simulate switching to another household 'h2'
      householdStore.setCurrentHousehold({
        id: 'h2',
        name: 'Household 2',
        slug: 'household-2',
        role: 'member',
      });

      await flushPromises();
      await nextTick();

      // Verify loadLists was called again with the new household ID
      expect(loadListsSpy).toHaveBeenCalledWith('h2');
      expect(loadListsSpy).toHaveBeenCalledTimes(2);

      wrapper.unmount();
    });

    it('should not reload shopping lists when household is cleared', async () => {
      const { wrapper, householdStore, loadListsSpy } = await mountDashboard();

      // Set a household first
      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      expect(loadListsSpy).toHaveBeenCalledWith('h1');

      // Clear the current household
      householdStore.setCurrentHousehold(null);

      await flushPromises();
      await nextTick();

      // loadLists should not be called again (still only 1 call)
      expect(loadListsSpy).toHaveBeenCalledTimes(1);

      wrapper.unmount();
    });

    it('should handle sequential household switches correctly', async () => {
      const { wrapper, householdStore, loadListsSpy } = await mountDashboard();

      // Switch to household 1
      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      expect(loadListsSpy).toHaveBeenCalledWith('h1');

      // Switch to household 2
      householdStore.setCurrentHousehold({
        id: 'h2',
        name: 'Household 2',
        slug: 'household-2',
        role: 'member',
      });

      await flushPromises();
      await nextTick();

      expect(loadListsSpy).toHaveBeenCalledWith('h2');

      // Switch to household 3
      householdStore.setCurrentHousehold({
        id: 'h3',
        name: 'Household 3',
        slug: 'household-3',
        role: 'admin',
      });

      await flushPromises();
      await nextTick();

      expect(loadListsSpy).toHaveBeenCalledWith('h3');
      expect(loadListsSpy).toHaveBeenCalledTimes(3);

      wrapper.unmount();
    });

    it('household switch triggers exactly one load sequence', async () => {
      const { wrapper, householdStore, loadListsSpy } = await mountDashboard();

      // Switch to household 'h1'
      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      // All three data-loading functions should be called exactly once
      expect(loadListsSpy).toHaveBeenCalledTimes(1);
      expect(loadListsSpy).toHaveBeenCalledWith('h1');
      expect(loadWishlistsByHouseholdMock).toHaveBeenCalledTimes(1);
      expect(loadWishlistsByHouseholdMock).toHaveBeenCalledWith('u1', 'h1');
      expect(loadHouseholdWishlistsMock).toHaveBeenCalledTimes(1);
      expect(loadHouseholdWishlistsMock).toHaveBeenCalledWith('h1', 'u1');

      wrapper.unmount();
    });
  });

  describe('Deduplication', () => {
    it('should not duplicate loads when household is already loaded', async () => {
      const { wrapper, householdStore, loadListsSpy } = await mountDashboard();

      // Switch to household 'h1'
      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      expect(loadListsSpy).toHaveBeenCalledTimes(1);

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
      expect(loadListsSpy).toHaveBeenCalledTimes(1);

      wrapper.unmount();
    });
  });

  describe('Stale Requests', () => {
    it('should ignore stale request results via token pattern', async () => {
      const { wrapper, householdStore, loadListsSpy } = await mountDashboard();

      // Simulate a slow loadLists for household 'h1'
      let resolveH1: () => void = () => {};
      const h1Promise = new Promise<void>((resolve) => {
        resolveH1 = resolve;
      });
      loadListsSpy.mockImplementationOnce(() => h1Promise);

      // Switch to household h1 (starts slow load)
      householdStore.setCurrentHousehold({
        id: 'h1',
        name: 'Household 1',
        slug: 'household-1',
        role: 'owner',
      });
      await nextTick();

      // Before h1 finishes, switch to h2 (this invalidates h1's token)
      loadListsSpy.mockResolvedValueOnce(undefined);
      loadWishlistsByHouseholdMock.mockResolvedValueOnce(undefined);
      loadHouseholdWishlistsMock.mockResolvedValueOnce(undefined);

      householdStore.setCurrentHousehold({
        id: 'h2',
        name: 'Household 2',
        slug: 'household-2',
        role: 'member',
      });

      await flushPromises();
      await nextTick();

      // Now resolve h1's slow response
      resolveH1();
      await flushPromises();
      await nextTick();

      // The latest call should be for h2, confirming h1's stale result was superseded
      const lastCall = loadListsSpy.mock.calls[loadListsSpy.mock.calls.length - 1];
      expect(lastCall[0]).toBe('h2');

      wrapper.unmount();
    });

    it('should reload household A in an A→B→A switch while B is in flight', async () => {
      const { wrapper, householdStore, loadListsSpy } = await mountDashboard();

      // 1. Load household A (completes successfully)
      householdStore.setCurrentHousehold({
        id: 'hA',
        name: 'Household A',
        slug: 'household-a',
        role: 'owner',
      });
      await flushPromises();
      await nextTick();

      expect(loadListsSpy).toHaveBeenCalledWith('hA');
      loadListsSpy.mockClear();
      loadWishlistsByHouseholdMock.mockClear();
      loadHouseholdWishlistsMock.mockClear();

      // 2. Switch to household B with a slow response (stays in flight)
      let resolveB: () => void = () => {};
      const bPromise = new Promise<void>((resolve) => {
        resolveB = resolve;
      });
      loadListsSpy.mockImplementationOnce(() => bPromise);

      householdStore.setCurrentHousehold({
        id: 'hB',
        name: 'Household B',
        slug: 'household-b',
        role: 'member',
      });
      await nextTick();

      // 3. While B is still in flight, switch back to A
      loadListsSpy.mockResolvedValueOnce(undefined);
      loadWishlistsByHouseholdMock.mockResolvedValueOnce(undefined);
      loadHouseholdWishlistsMock.mockResolvedValueOnce(undefined);

      householdStore.setCurrentHousehold({
        id: 'hA',
        name: 'Household A',
        slug: 'household-a',
        role: 'owner',
      });

      await flushPromises();
      await nextTick();

      // A must have been re-issued despite being the last *completed* load
      expect(loadListsSpy).toHaveBeenCalledWith('hA');

      // 4. Resolve the stale B response — it should not overwrite A
      resolveB();
      await flushPromises();
      await nextTick();

      // The most recent successful call is for A, not B
      const lastCall = loadListsSpy.mock.calls[loadListsSpy.mock.calls.length - 1];
      expect(lastCall[0]).toBe('hA');

      wrapper.unmount();
    });
  });
});
