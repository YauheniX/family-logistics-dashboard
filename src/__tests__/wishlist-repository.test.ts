import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/features/shared/infrastructure/supabase.client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

import {
  WishlistRepository,
  WishlistItemRepository,
} from '@/features/wishlist/infrastructure/wishlist.repository';

const mockWishlist = {
  id: 'w1',
  user_id: 'u1',
  member_id: 'm1',
  household_id: 'h1',
  title: 'Birthday Wishes',
  description: null,
  visibility: 'private' as const,
  share_slug: 'abc12345',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: null,
};

const mockWishlistWithMember = {
  ...mockWishlist,
  member: { display_name: 'John', role: 'member' },
};

const mockItem = {
  id: 'wi1',
  wishlist_id: 'w1',
  title: 'New Book',
  description: null,
  link: null,
  price: 19.99,
  currency: 'USD',
  priority: 'medium',
  is_reserved: false,
  reserved_by_email: null,
  reserved_by_name: null,
  reserved_at: null,
  created_at: '2024-01-01T00:00:00Z',
};

type SpyResponse = { data: unknown | null; error: { message: string } | null };

describe('WishlistRepository', () => {
  let repo: WishlistRepository;

  beforeEach(() => {
    vi.restoreAllMocks();
    repo = new WishlistRepository();
  });

  describe('findByUserId', () => {
    it('returns wishlists with is_public added', async () => {
      vi.spyOn(repo, 'findAll').mockResolvedValue({
        data: [mockWishlist] as never[],
        error: null,
      });

      const result = await repo.findByUserId('u1');

      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toHaveProperty('is_public', false);
      expect(result.error).toBeNull();
    });

    it('propagates error', async () => {
      vi.spyOn(repo, 'findAll').mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      });

      const result = await repo.findByUserId('u1');

      expect(result.error?.message).toBe('Query failed');
      expect(result.data).toBeNull();
    });
  });

  describe('findByUserIdAndHouseholdId', () => {
    it('filters out child role, transforms, adds is_public', async () => {
      const childWishlist = {
        ...mockWishlist,
        id: 'w2',
        member: { display_name: 'Kid', role: 'child' },
      };

      const querySpy = vi.spyOn(repo as any, 'query');
      querySpy.mockResolvedValue({
        data: [mockWishlistWithMember, childWishlist],
        error: null,
      });

      const result = await repo.findByUserIdAndHouseholdId('u1', 'h1');

      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toHaveProperty('is_public', false);
      expect(result.data![0]).toHaveProperty('member_name', 'John');
      // nested member object should be removed
      expect(result.data![0]).toHaveProperty('member', undefined);
    });

    it('returns error', async () => {
      vi.spyOn(repo as any, 'query').mockResolvedValue({
        data: null,
        error: { message: 'Household query failed' },
      });

      const result = await repo.findByUserIdAndHouseholdId('u1', 'h1');

      expect(result.error?.message).toBe('Household query failed');
      expect(result.data).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('returns wishlist with is_public', async () => {
      const publicWishlist = { ...mockWishlist, visibility: 'public' as const };
      vi.spyOn(repo as any, 'query').mockResolvedValue({
        data: publicWishlist,
        error: null,
      });

      const result = await repo.findBySlug('abc12345');

      expect(result.data).toHaveProperty('is_public', true);
      expect(result.error).toBeNull();
    });

    it('propagates error', async () => {
      vi.spyOn(repo as any, 'query').mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await repo.findBySlug('nonexistent');

      expect(result.error?.message).toBe('Not found');
      expect(result.data).toBeNull();
    });
  });

  describe('findById', () => {
    it('adds is_public', async () => {
      // Mock the parent class findById via the prototype
      vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(repo)),
        'findById',
      ).mockResolvedValue({
        data: mockWishlist,
        error: null,
      });

      const result = await repo.findById('w1');

      expect(result.data).toHaveProperty('is_public', false);
      expect(result.error).toBeNull();
    });

    it('propagates error', async () => {
      vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(repo)),
        'findById',
      ).mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await repo.findById('w1');

      expect(result.error?.message).toBe('Not found');
    });
  });

  describe('update', () => {
    it('adds is_public', async () => {
      vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(repo)),
        'update',
      ).mockResolvedValue({
        data: { ...mockWishlist, title: 'Updated' },
        error: null,
      });

      const result = await repo.update('w1', { title: 'Updated' });

      expect(result.data).toHaveProperty('is_public', false);
      expect(result.data).toHaveProperty('title', 'Updated');
    });

    it('propagates error', async () => {
      vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(repo)),
        'update',
      ).mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await repo.update('w1', { title: 'Updated' });

      expect(result.error?.message).toBe('Update failed');
    });
  });

  describe('create', () => {
    it('authenticates, resolves member, creates', async () => {
      vi.spyOn(repo as any, 'getAuthenticatedUserId').mockResolvedValue({
        data: 'u1',
        error: null,
      });

      // Mock supabase.from('members') chain for member lookup
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      const memberSelectChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'm1' },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue(memberSelectChain),
      } as any);

      vi.spyOn(repo as any, 'execute').mockResolvedValue({
        data: mockWishlist,
        error: null,
      } satisfies SpyResponse);

      const result = await repo.create({
        title: 'Birthday Wishes',
        description: null,
        household_id: 'h1',
        share_slug: 'abc12345',
      });

      expect(result.data).toHaveProperty('is_public', false);
      expect(result.error).toBeNull();
    });

    it('returns error on auth failure', async () => {
      vi.spyOn(repo as any, 'getAuthenticatedUserId').mockResolvedValue({
        data: null,
        error: { message: 'Authentication required' },
      });

      const result = await repo.create({
        title: 'Birthday Wishes',
        description: null,
        share_slug: 'abc12345',
      });

      expect(result.error?.message).toBe('Authentication required');
      expect(result.data).toBeNull();
    });

    it('returns error when member lookup fails (householdId provided)', async () => {
      vi.spyOn(repo as any, 'getAuthenticatedUserId').mockResolvedValue({
        data: 'u1',
        error: null,
      });

      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      const memberSelectChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found', details: null },
              }),
            }),
          }),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue(memberSelectChain),
      } as any);

      const result = await repo.create({
        title: 'Birthday Wishes',
        description: null,
        household_id: 'h1',
        share_slug: 'abc12345',
      });

      expect(result.error?.message).toBe(
        'User must belong to this household to create wishlists',
      );
    });

    it('uses first membership when no household_id provided', async () => {
      vi.spyOn(repo as any, 'getAuthenticatedUserId').mockResolvedValue({
        data: 'u1',
        error: null,
      });

      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      const memberSelectChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'm1', household_id: 'h1' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue(memberSelectChain),
      } as any);

      vi.spyOn(repo as any, 'execute').mockResolvedValue({
        data: mockWishlist,
        error: null,
      } satisfies SpyResponse);

      const result = await repo.create({
        title: 'Birthday Wishes',
        description: null,
        share_slug: 'abc12345',
      });

      expect(result.data).toHaveProperty('is_public', false);
      expect(result.error).toBeNull();
    });
  });

  describe('findByHouseholdId', () => {
    it('filters out current user wishlists when user is member', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');

      // Mock members query to return current user's member_id
      const memberSelectChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'm1' },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue(memberSelectChain),
      } as any);

      // Mock wishlists query - includes current user's wishlist and another member's
      const otherWishlist = {
        ...mockWishlistWithMember,
        id: 'w2',
        member_id: 'm2',
        visibility: 'household',
        member: { display_name: 'Jane', role: 'member' },
      };

      vi.spyOn(repo as any, 'query').mockResolvedValue({
        data: [
          { ...mockWishlistWithMember, visibility: 'household' },
          otherWishlist,
        ],
        error: null,
      });

      const result = await repo.findByHouseholdId('h1', 'u1');

      // Only the other member's wishlist should be returned
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toHaveProperty('is_public', false);
      expect(result.data![0]).toHaveProperty('member_name', 'Jane');
    });

    it('returns all shared wishlists when user not in household', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');

      // Mock members query - user not found
      const memberSelectChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue(memberSelectChain),
      } as any);

      vi.spyOn(repo as any, 'query').mockResolvedValue({
        data: [{ ...mockWishlistWithMember, visibility: 'household' }],
        error: null,
      });

      const result = await repo.findByHouseholdId('h1', 'u1');

      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toHaveProperty('is_public', false);
    });

    it('returns error on member lookup failure', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');

      const memberSelectChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '42P01', message: 'Table not found', details: null },
              }),
            }),
          }),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue(memberSelectChain),
      } as any);

      const result = await repo.findByHouseholdId('h1', 'u1');

      expect(result.error?.message).toBe('Failed to get user member');
    });

    it('returns error on wishlists query failure', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');

      // Mock successful member lookup
      const memberSelectChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'm1' },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue(memberSelectChain),
      } as any);

      vi.spyOn(repo as any, 'query').mockResolvedValue({
        data: null,
        error: { message: 'Wishlists query failed' },
      });

      const result = await repo.findByHouseholdId('h1', 'u1');

      expect(result.error?.message).toBe('Wishlists query failed');
    });
  });

  describe('findChildrenWishlists', () => {
    it('filters for child role', async () => {
      const childWishlist = {
        ...mockWishlist,
        member: { display_name: 'Kid', role: 'child' },
      };
      const adultWishlist = {
        ...mockWishlist,
        id: 'w2',
        member: { display_name: 'John', role: 'member' },
      };

      vi.spyOn(repo as any, 'query').mockResolvedValue({
        data: [childWishlist, adultWishlist],
        error: null,
      });

      const result = await repo.findChildrenWishlists('u1', 'h1');

      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toHaveProperty('member_name', 'Kid');
      expect(result.data![0]).toHaveProperty('is_public', false);
    });

    it('propagates error', async () => {
      vi.spyOn(repo as any, 'query').mockResolvedValue({
        data: null,
        error: { message: 'Children query failed' },
      });

      const result = await repo.findChildrenWishlists('u1', 'h1');

      expect(result.error?.message).toBe('Children query failed');
      expect(result.data).toBeNull();
    });
  });
});

describe('WishlistItemRepository', () => {
  let repo: WishlistItemRepository;

  beforeEach(() => {
    vi.restoreAllMocks();
    repo = new WishlistItemRepository();
  });

  describe('findByWishlistId', () => {
    it('returns items', async () => {
      vi.spyOn(repo, 'findAll').mockResolvedValue({
        data: [mockItem] as never[],
        error: null,
      });

      const result = await repo.findByWishlistId('w1');

      expect(result.data).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it('propagates error', async () => {
      vi.spyOn(repo, 'findAll').mockResolvedValue({
        data: null,
        error: { message: 'Items query failed' },
      });

      const result = await repo.findByWishlistId('w1');

      expect(result.error?.message).toBe('Items query failed');
    });
  });

  describe('reserveItem', () => {
    it('reserves item successfully', async () => {
      const querySpy = vi.spyOn(repo as any, 'query');
      querySpy.mockResolvedValue({
        data: { ...mockItem, is_reserved: true, reserved_by_email: 'friend@test.com' },
        error: null,
      });

      const result = await repo.reserveItem('wi1', {
        is_reserved: true,
        reserved_by_email: 'friend@test.com',
        reserved_by_name: 'Friend',
      });

      expect(result.data).toHaveProperty('is_reserved', true);
      expect(result.error).toBeNull();
    });

    it('propagates RPC error', async () => {
      vi.spyOn(repo as any, 'query').mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      const result = await repo.reserveItem('wi1', {
        is_reserved: true,
        reserved_by_email: 'friend@test.com',
        reserved_by_name: null,
      });

      expect(result.error?.message).toBe('RPC failed');
    });

    it('handles RPC returning success=false', async () => {
      // When RPC returns success=false, the query method catches the thrown error
      vi.spyOn(repo as any, 'query').mockResolvedValue({
        data: null,
        error: { message: 'Already reserved by someone else' },
      });

      const result = await repo.reserveItem('wi1', {
        is_reserved: true,
        reserved_by_email: 'friend@test.com',
        reserved_by_name: null,
      });

      expect(result.error?.message).toBe('Already reserved by someone else');
      expect(result.data).toBeNull();
    });
  });
});
