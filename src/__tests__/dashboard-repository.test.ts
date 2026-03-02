import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/features/shared/infrastructure/supabase.client', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

import { DashboardRepository } from '@/features/shared/infrastructure/dashboard.repository';
import { supabase } from '@/features/shared/infrastructure/supabase.client';

const mockRpc = supabase.rpc as ReturnType<typeof vi.fn>;

const mockAggregate = {
  shopping_lists: [
    {
      id: 'sl1',
      household_id: 'h1',
      title: 'Groceries',
      description: null,
      status: 'active',
      created_by: 'u1',
      created_by_member_id: 'm1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: null,
    },
  ],
  my_wishlists: [
    {
      id: 'w1',
      user_id: 'u1',
      member_id: 'm1',
      household_id: 'h1',
      title: 'Birthday Wishes',
      description: null,
      visibility: 'private',
      share_slug: 'abc12345',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: null,
      member_name: 'Alice',
      is_public: false,
    },
  ],
  household_wishlists: [
    {
      id: 'w2',
      user_id: 'u2',
      member_id: 'm2',
      household_id: 'h1',
      title: "Bob's Wishlist",
      description: null,
      visibility: 'household',
      share_slug: 'xyz98765',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: null,
      member_name: 'Bob',
      is_public: false,
    },
  ],
};

describe('DashboardRepository', () => {
  let repo: DashboardRepository;

  beforeEach(() => {
    vi.restoreAllMocks();
    repo = new DashboardRepository();
  });

  describe('getDashboardSummary', () => {
    it('calls supabase.rpc with correct parameters', async () => {
      mockRpc.mockResolvedValue({ data: mockAggregate, error: null });

      await repo.getDashboardSummary('h1', 'u1');

      expect(mockRpc).toHaveBeenCalledWith('get_dashboard_summary', {
        p_household_id: 'h1',
        p_user_id: 'u1',
      });
    });

    it('returns correctly shaped DashboardAggregate on success', async () => {
      mockRpc.mockResolvedValue({ data: mockAggregate, error: null });

      const result = await repo.getDashboardSummary('h1', 'u1');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();

      // Shopping lists shape
      expect(result.data!.shoppingLists).toHaveLength(1);
      expect(result.data!.shoppingLists[0].id).toBe('sl1');
      expect(result.data!.shoppingLists[0].status).toBe('active');

      // My wishlists shape
      expect(result.data!.myWishlists).toHaveLength(1);
      expect(result.data!.myWishlists[0].id).toBe('w1');
      expect(result.data!.myWishlists[0].title).toBe('Birthday Wishes');

      // Household wishlists shape
      expect(result.data!.householdWishlists).toHaveLength(1);
      expect(result.data!.householdWishlists[0].id).toBe('w2');
      expect(result.data!.householdWishlists[0].visibility).toBe('household');
    });

    it('returns empty arrays when RPC returns empty collections', async () => {
      mockRpc.mockResolvedValue({
        data: { shopping_lists: [], my_wishlists: [], household_wishlists: [] },
        error: null,
      });

      const result = await repo.getDashboardSummary('h1', 'u1');

      expect(result.error).toBeNull();
      expect(result.data!.shoppingLists).toEqual([]);
      expect(result.data!.myWishlists).toEqual([]);
      expect(result.data!.householdWishlists).toEqual([]);
    });

    it('returns error when user is not a household member (auth boundary)', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: {
          message: 'User is not an active member of this household',
          code: 'P0001',
          details: null,
        },
      });

      const result = await repo.getDashboardSummary('other-household', 'u1');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.message).toContain('not an active member');
    });

    it('returns error when cross-user access is attempted (auth boundary)', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: {
          message: 'Unauthorized: cannot query data for another user',
          code: 'P0001',
          details: null,
        },
      });

      const result = await repo.getDashboardSummary('h1', 'other-user');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.message).toContain('Unauthorized');
    });

    it('returns error when authentication is missing', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: {
          message: 'Authentication required',
          code: 'P0001',
          details: null,
        },
      });

      const result = await repo.getDashboardSummary('h1', 'u1');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.message).toBe('Authentication required');
    });

    it('returns error when RPC call throws an exception', async () => {
      mockRpc.mockRejectedValue(new Error('Network failure'));

      const result = await repo.getDashboardSummary('h1', 'u1');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.message).toBe('Network failure');
    });

    it('returns error when RPC returns null data with no error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await repo.getDashboardSummary('h1', 'u1');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.message).toContain('No data returned');
    });
  });
});
