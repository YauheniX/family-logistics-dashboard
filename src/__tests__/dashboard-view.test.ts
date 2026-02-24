import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import DashboardView from '@/views/DashboardView.vue';
import { useHouseholdStore } from '@/stores/household';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';

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
    loadWishlists: vi.fn(),
  }),
}));

describe('DashboardView', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Create a minimal router for testing
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/households', component: { template: '<div />' } },
      ],
    });
  });

  describe('Household Switching', () => {
    it('should reload shopping lists when household is switched', async () => {
      const wrapper = mount(DashboardView, {
        global: {
          plugins: [createPinia(), router],
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

      // Spy on loadLists method
      const loadListsSpy = vi.spyOn(shoppingStore, 'loadLists');

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
      const wrapper = mount(DashboardView, {
        global: {
          plugins: [createPinia(), router],
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

      // Spy on loadLists method
      const loadListsSpy = vi.spyOn(shoppingStore, 'loadLists');

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
      const wrapper = mount(DashboardView, {
        global: {
          plugins: [createPinia(), router],
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

      // Spy on loadLists method
      const loadListsSpy = vi.spyOn(shoppingStore, 'loadLists');

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
  });
});
