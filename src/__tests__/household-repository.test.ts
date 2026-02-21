import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemberRepository } from '@/features/household/infrastructure/household.repository';

vi.mock('@/features/shared/infrastructure/supabase.client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('MemberRepository', () => {
  let repository: MemberRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new MemberRepository();
  });

  describe('softDelete', () => {
    it('should set is_active to false for the member', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      const memberId = 'member-123';

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: memberId, is_active: false },
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.softDelete(memberId);

      expect(supabase.from).toHaveBeenCalledWith('members');
      expect(mockChain.update).toHaveBeenCalledWith({ is_active: false });
      expect(mockChain.eq).toHaveBeenCalledWith('id', memberId);
      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
    });

    it('should return error when database operation fails', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      const memberId = 'member-123';
      const errorMessage = 'Database connection error';

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: errorMessage },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.softDelete(memberId);

      expect(result.error).toEqual({ message: errorMessage });
      expect(result.data).toBeNull();
    });

    it('should handle invalid member ID gracefully', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      const invalidMemberId = 'non-existent-id';

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.softDelete(invalidMemberId);

      expect(supabase.from).toHaveBeenCalledWith('members');
      expect(mockChain.update).toHaveBeenCalledWith({ is_active: false });
      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
    });
  });
});
