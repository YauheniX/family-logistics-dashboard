import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useHouseholdStore, type Household } from '@/stores/household';

describe('Household Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should initialize with null household and empty list', () => {
      const store = useHouseholdStore();
      expect(store.currentHousehold).toBeNull();
      expect(store.households).toEqual([]);
      expect(store.loading).toBe(false);
    });
  });

  describe('Getters', () => {
    it('should return hasMultipleHouseholds correctly', () => {
      const store = useHouseholdStore();
      expect(store.hasMultipleHouseholds).toBe(false);

      const mockHouseholds: Household[] = [
        { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' },
        { id: '2', name: 'House 2', slug: 'house-2', role: 'member' },
      ];
      store.loadHouseholds(mockHouseholds);
      expect(store.hasMultipleHouseholds).toBe(true);
    });

    it('should return currentRole correctly', () => {
      const store = useHouseholdStore();
      expect(store.currentRole).toBeNull();

      const household: Household = { id: '1', name: 'House 1', slug: 'house-1', role: 'admin' };
      store.setCurrentHousehold(household);
      expect(store.currentRole).toBe('admin');
    });

    it('should calculate isOwnerOrAdmin correctly', () => {
      const store = useHouseholdStore();

      const ownerHousehold: Household = {
        id: '1',
        name: 'House 1',
        slug: 'house-1',
        role: 'owner',
      };
      store.setCurrentHousehold(ownerHousehold);
      expect(store.isOwnerOrAdmin).toBe(true);

      const adminHousehold: Household = {
        id: '2',
        name: 'House 2',
        slug: 'house-2',
        role: 'admin',
      };
      store.setCurrentHousehold(adminHousehold);
      expect(store.isOwnerOrAdmin).toBe(true);

      const memberHousehold: Household = {
        id: '3',
        name: 'House 3',
        slug: 'house-3',
        role: 'member',
      };
      store.setCurrentHousehold(memberHousehold);
      expect(store.isOwnerOrAdmin).toBe(false);
    });

    it('should calculate canManageMembers correctly', () => {
      const store = useHouseholdStore();

      const ownerHousehold: Household = {
        id: '1',
        name: 'House 1',
        slug: 'house-1',
        role: 'owner',
      };
      store.setCurrentHousehold(ownerHousehold);
      expect(store.canManageMembers).toBe(true);

      const memberHousehold: Household = {
        id: '2',
        name: 'House 2',
        slug: 'house-2',
        role: 'member',
      };
      store.setCurrentHousehold(memberHousehold);
      expect(store.canManageMembers).toBe(false);
    });

    it('should calculate canEditContent correctly', () => {
      const store = useHouseholdStore();

      const ownerHousehold: Household = {
        id: '1',
        name: 'House 1',
        slug: 'house-1',
        role: 'owner',
      };
      store.setCurrentHousehold(ownerHousehold);
      expect(store.canEditContent).toBe(true);

      const memberHousehold: Household = {
        id: '2',
        name: 'House 2',
        slug: 'house-2',
        role: 'member',
      };
      store.setCurrentHousehold(memberHousehold);
      expect(store.canEditContent).toBe(true);

      const viewerHousehold: Household = {
        id: '3',
        name: 'House 3',
        slug: 'house-3',
        role: 'viewer',
      };
      store.setCurrentHousehold(viewerHousehold);
      expect(store.canEditContent).toBe(false);
    });
  });

  describe('setCurrentHousehold', () => {
    it('should set current household and persist to localStorage', () => {
      const store = useHouseholdStore();
      const household: Household = { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' };

      store.setCurrentHousehold(household);

      expect(store.currentHousehold).toEqual(household);
      expect(localStorage.getItem('current_household_id')).toBe('1');
    });

    it('should clear localStorage when setting null', () => {
      const store = useHouseholdStore();
      const household: Household = { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' };

      store.setCurrentHousehold(household);
      expect(localStorage.getItem('current_household_id')).toBe('1');

      store.setCurrentHousehold(null);
      expect(store.currentHousehold).toBeNull();
      expect(localStorage.getItem('current_household_id')).toBeNull();
    });
  });

  describe('loadHouseholds', () => {
    it('should load households and set first as current', () => {
      const store = useHouseholdStore();
      const mockHouseholds: Household[] = [
        { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' },
        { id: '2', name: 'House 2', slug: 'house-2', role: 'member' },
      ];

      store.loadHouseholds(mockHouseholds);

      expect(store.households).toEqual(mockHouseholds);
      expect(store.currentHousehold).toEqual(mockHouseholds[0]);
      expect(localStorage.getItem('current_household_id')).toBe('1');
    });

    it('should restore saved household from localStorage', () => {
      const store = useHouseholdStore();
      localStorage.setItem('current_household_id', '2');

      const mockHouseholds: Household[] = [
        { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' },
        { id: '2', name: 'House 2', slug: 'house-2', role: 'member' },
      ];

      store.loadHouseholds(mockHouseholds);

      expect(store.currentHousehold).toEqual(mockHouseholds[1]);
      expect(localStorage.getItem('current_household_id')).toBe('2');
    });

    it('should fallback to first household if saved ID not found', () => {
      const store = useHouseholdStore();
      localStorage.setItem('current_household_id', '999');

      const mockHouseholds: Household[] = [
        { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' },
      ];

      store.loadHouseholds(mockHouseholds);

      expect(store.currentHousehold).toEqual(mockHouseholds[0]);
      expect(localStorage.getItem('current_household_id')).toBe('1');
    });

    it('should handle empty household list', () => {
      const store = useHouseholdStore();

      store.loadHouseholds([]);

      expect(store.households).toEqual([]);
      expect(store.currentHousehold).toBeNull();
    });
  });

  describe('switchHousehold', () => {
    it('should switch to existing household', () => {
      const store = useHouseholdStore();
      const mockHouseholds: Household[] = [
        { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' },
        { id: '2', name: 'House 2', slug: 'house-2', role: 'member' },
      ];

      store.loadHouseholds(mockHouseholds);
      expect(store.currentHousehold?.id).toBe('1');

      store.switchHousehold('2');

      expect(store.currentHousehold).toEqual(mockHouseholds[1]);
      expect(localStorage.getItem('current_household_id')).toBe('2');
    });

    it('should not switch to non-existent household', () => {
      const store = useHouseholdStore();
      const mockHouseholds: Household[] = [
        { id: '1', name: 'House 1', slug: 'house-1', role: 'owner' },
      ];

      store.loadHouseholds(mockHouseholds);

      store.switchHousehold('999');

      expect(store.currentHousehold).toEqual(mockHouseholds[0]);
    });
  });

  describe('initializeMockHouseholds', () => {
    it('should initialize with 3 mock households', () => {
      const store = useHouseholdStore();

      store.initializeMockHouseholds();

      expect(store.households).toHaveLength(3);
      expect(store.currentHousehold).not.toBeNull();
      expect(store.households[0].name).toBe('Smith Family');
      expect(store.households[1].name).toBe('Extended Family');
      expect(store.households[2].name).toBe('Friends Group');
    });

    it('should set first mock household as current', () => {
      const store = useHouseholdStore();

      store.initializeMockHouseholds();

      expect(store.currentHousehold?.id).toBe('1');
      expect(store.currentHousehold?.name).toBe('Smith Family');
      expect(localStorage.getItem('current_household_id')).toBe('1');
    });
  });
});
