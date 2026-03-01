import { PostgrestError } from '@supabase/supabase-js';
import type { TypedSupabaseClient } from './supabase.client';
import type { ApiResponse, ApiError, QueryBuilder } from '../domain/repository.interface';
import { repositoryCache } from '../../../utils/cache';

/**
 * Converts Supabase PostgrestError to our ApiError format
 */
export function toApiError(error: PostgrestError | Error | unknown): ApiError {
  if (!error) {
    return { message: 'An unknown error occurred' };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      details: error,
    };
  }

  const postgrestError = error as PostgrestError;
  if (postgrestError.message) {
    return {
      message: postgrestError.message,
      code: postgrestError.code,
      details: postgrestError.details,
    };
  }

  return { message: 'An unknown error occurred', details: error };
}

/**
 * Base repository implementation with Supabase
 * Provides common CRUD operations
 */
export abstract class BaseRepository<
  TEntity,
  TCreateDto = Partial<TEntity>,
  TUpdateDto = Partial<TEntity>,
> {
  /** Cache instance shared across all repositories */
  protected readonly cache = repositoryCache;

  constructor(
    protected readonly supabase: TypedSupabaseClient,
    protected readonly tableName: string,
  ) {}

  /**
   * Build a cache key scoped to this table.
   * Sub-classes should include tenant identifiers (e.g. householdId) for isolation.
   */
  protected cacheKey(...segments: string[]): string {
    return [this.tableName, ...segments].join(':');
  }

  /**
   * Read-through cache wrapper for repository queries.
   * Only caches successful responses (where `error` is null).
   */
  protected async cachedQuery<T>(
    key: string,
    fetcher: () => Promise<ApiResponse<T>>,
    ttlMs?: number,
  ): Promise<ApiResponse<T>> {
    const cached = this.cache.get<ApiResponse<T>>(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await fetcher();
    if (result.error === null) {
      this.cache.set(key, result, ttlMs);
    }
    return result;
  }

  /**
   * Invalidate all cache entries for this table.
   */
  protected invalidateTable(): void {
    this.cache.invalidateByPrefix(this.tableName + ':');
  }

  /**
   * Wrap a write operation so the table cache is invalidated on success.
   * Protected so subclasses can use it for custom write methods.
   */
  protected async writeThrough<T>(op: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
    const result = await op();
    if (!result.error) this.invalidateTable();
    return result;
  }

  /**
   * Execute a query and return a typed response with error handling
   */
  protected async query<T>(
    operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  ): Promise<ApiResponse<T>> {
    try {
      const { data, error } = await operation();

      if (error) {
        return {
          data: null,
          error: toApiError(error),
        };
      }

      return {
        data,
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: toApiError(err),
      };
    }
  }

  /**
   * Find all records
   */
  async findAll(query?: QueryBuilder): Promise<ApiResponse<TEntity[]>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.query(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let builder = this.supabase.from(this.tableName as any).select('*');
      if (query) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        builder = query(builder as any) as any;
      }
      return await builder;
    }) as Promise<ApiResponse<TEntity[]>>;
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<ApiResponse<TEntity>> {
    return this.cachedQuery(this.cacheKey('id', id), () =>
      this.query(async () => {
        return await this.supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(this.tableName as any)
          .select('*')
          .eq('id', id)
          .single();
      }),
    );
  }

  /**
   * Create a new record
   */
  async create(dto: TCreateDto): Promise<ApiResponse<TEntity>> {
    return this.writeThrough(() =>
      this.query(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await this.supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(this.tableName as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(dto as any)
          .select()
          .single();
      }),
    );
  }

  /**
   * Create multiple records
   */
  async createMany(dtos: TCreateDto[]): Promise<ApiResponse<TEntity[]>> {
    return this.writeThrough(() =>
      this.query(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await this.supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(this.tableName as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(dtos as any)
          .select();
      }),
    );
  }

  /**
   * Update a record by ID
   */
  async update(id: string, dto: TUpdateDto): Promise<ApiResponse<TEntity>> {
    return this.writeThrough(() =>
      this.query(async () => {
        return await this.supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(this.tableName as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(dto as any)
          .eq('id', id)
          .select()
          .single();
      }),
    );
  }

  /**
   * Upsert a record
   */
  async upsert(dto: Partial<TEntity>): Promise<ApiResponse<TEntity>> {
    return this.writeThrough(() =>
      this.query(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await this.supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(this.tableName as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .upsert(dto as any)
          .select()
          .single();
      }),
    );
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return this.writeThrough(() =>
      this.query(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await this.supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(this.tableName as any)
          .delete()
          .eq('id', id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { data: null as any, error };
      }),
    );
  }

  /**
   * Execute a custom query
   */
  protected async execute<T>(
    operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  ): Promise<ApiResponse<T>> {
    return this.query(operation);
  }

  protected async getAuthenticatedUserId(): Promise<ApiResponse<string>> {
    try {
      const { data, error } = await this.supabase.auth.getUser();

      if (error) {
        return { data: null, error: toApiError(error) };
      }

      const userId = data.user?.id;
      if (!userId) {
        return { data: null, error: { message: 'Authentication required' } };
      }

      return { data: userId, error: null };
    } catch (err) {
      return { data: null, error: toApiError(err) };
    }
  }
}
