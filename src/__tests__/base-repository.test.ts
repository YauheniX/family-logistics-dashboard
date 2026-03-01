import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/features/shared/infrastructure/supabase.client';

// Mock supabase
vi.mock('@/features/shared/infrastructure/supabase.client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// We need to import after the mock is set up
const { BaseRepository } = await import(
  '@/features/shared/infrastructure/base.repository'
);

// Re-export toApiError for direct testing
const { toApiError } = await import(
  '@/features/shared/infrastructure/base.repository'
);

interface TestEntity {
  id: string;
  name: string;
  created_at?: string;
}

class TestRepository extends BaseRepository<TestEntity, Partial<TestEntity>> {
  constructor() {
    super(supabase as never, 'test_table');
  }

  public async testGetAuthenticatedUserId() {
    return this.getAuthenticatedUserId();
  }

  public async testExecute<T>(op: () => Promise<{ data: T | null; error: import('@supabase/supabase-js').PostgrestError | null }>) {
    return this.execute(op);
  }
}

const mockData: TestEntity = { id: '1', name: 'Test', created_at: '2024-01-01' };

describe('BaseRepository', () => {
  let repository: TestRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new TestRepository();
  });

  describe('findAll', () => {
    it('returns all records', async () => {
      const mockChain = {
        select: vi.fn().mockResolvedValue({ data: [mockData], error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.findAll();

      expect(supabase.from).toHaveBeenCalledWith('test_table');
      expect(result.data).toEqual([mockData]);
      expect(result.error).toBeNull();
    });

    it('applies a query builder when provided', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [mockData], error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const queryBuilder = (builder: { eq: (col: string, val: string) => unknown }) =>
        builder.eq('name', 'Test');

      const result = await repository.findAll(queryBuilder);

      expect(mockChain.eq).toHaveBeenCalledWith('name', 'Test');
      expect(result.data).toEqual([mockData]);
    });
  });

  describe('findById', () => {
    it('returns a record by id', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.findById('1');

      expect(mockChain.eq).toHaveBeenCalledWith('id', '1');
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('returns error when record not found', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Row not found', code: 'PGRST116', details: null, hint: null },
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.findById('999');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Row not found');
    });
  });

  describe('create', () => {
    it('creates a record successfully', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.create({ name: 'Test' });

      expect(supabase.from).toHaveBeenCalledWith('test_table');
      expect(mockChain.insert).toHaveBeenCalledWith({ name: 'Test' });
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('returns error on create failure', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed', code: '23505', details: null, hint: null },
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.create({ name: 'Test' });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Insert failed');
    });
  });

  describe('createMany', () => {
    it('creates multiple records successfully', async () => {
      const items = [mockData, { ...mockData, id: '2', name: 'Test 2' }];
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: items, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.createMany([{ name: 'Test' }, { name: 'Test 2' }]);

      expect(mockChain.insert).toHaveBeenCalledWith([{ name: 'Test' }, { name: 'Test 2' }]);
      expect(result.data).toEqual(items);
      expect(result.error).toBeNull();
    });

    it('returns error on createMany failure', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Batch insert failed', code: '23505', details: null, hint: null },
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.createMany([{ name: 'Test' }]);

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Batch insert failed');
    });
  });

  describe('update', () => {
    it('updates a record successfully', async () => {
      const updated = { ...mockData, name: 'Updated' };
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updated, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.update('1', { name: 'Updated' });

      expect(mockChain.update).toHaveBeenCalledWith({ name: 'Updated' });
      expect(mockChain.eq).toHaveBeenCalledWith('id', '1');
      expect(result.data).toEqual(updated);
      expect(result.error).toBeNull();
    });
  });

  describe('upsert', () => {
    it('upserts a record successfully', async () => {
      const mockChain = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.upsert({ id: '1', name: 'Test' });

      expect(mockChain.upsert).toHaveBeenCalledWith({ id: '1', name: 'Test' });
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('returns error on upsert failure', async () => {
      const mockChain = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upsert failed', code: '23505', details: null, hint: null },
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.upsert({ id: '1', name: 'Test' });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Upsert failed');
    });
  });

  describe('delete', () => {
    it('deletes a record successfully', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.delete('1');

      expect(mockChain.eq).toHaveBeenCalledWith('id', '1');
      expect(result.error).toBeNull();
    });

    it('returns error on delete failure', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Delete failed', code: '42501', details: null, hint: null },
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as never);

      const result = await repository.delete('1');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Delete failed');
    });
  });

  describe('getAuthenticatedUserId', () => {
    it('returns user id when authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as never);

      const result = await repository.testGetAuthenticatedUserId();

      expect(result.data).toBe('user-1');
      expect(result.error).toBeNull();
    });

    it('returns error from auth', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error', status: 401, name: 'AuthError' },
      } as never);

      const result = await repository.testGetAuthenticatedUserId();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Auth error');
    });

    it('returns error when user has no id', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: {} },
        error: null,
      } as never);

      const result = await repository.testGetAuthenticatedUserId();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Authentication required');
    });

    it('catches thrown exceptions', async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('Network failure'));

      const result = await repository.testGetAuthenticatedUserId();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Network failure');
    });
  });

  describe('query error handling', () => {
    it('catches thrown errors and converts them', async () => {
      const result = await repository.testExecute(() => {
        throw new Error('Unexpected crash');
      });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Unexpected crash');
    });
  });
});

describe('toApiError', () => {
  it('handles null error', () => {
    const result = toApiError(null);
    expect(result.message).toBe('An unknown error occurred');
  });

  it('handles undefined error', () => {
    const result = toApiError(undefined);
    expect(result.message).toBe('An unknown error occurred');
  });

  it('handles Error instance', () => {
    const result = toApiError(new Error('Something broke'));
    expect(result.message).toBe('Something broke');
    expect(result.details).toBeInstanceOf(Error);
  });

  it('handles PostgrestError-like object', () => {
    const pgError = { message: 'DB error', code: '42P01', details: 'relation missing', hint: '' };
    const result = toApiError(pgError);
    expect(result.message).toBe('DB error');
    expect(result.code).toBe('42P01');
    expect(result.details).toBe('relation missing');
  });

  it('handles unknown error without message', () => {
    const result = toApiError({ code: 123 });
    expect(result.message).toBe('An unknown error occurred');
    expect(result.details).toEqual({ code: 123 });
  });
});
