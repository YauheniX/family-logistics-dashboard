import { PostgrestError } from '@supabase/supabase-js';
import type { TypedSupabaseClient } from './supabase.client';
import type { ApiResponse, ApiError, QueryBuilder } from '../domain/repository.interface';

/**
 * Converts Supabase PostgrestError to our ApiError format
 */
function toApiError(error: PostgrestError | Error | unknown): ApiError {
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
  constructor(
    protected readonly supabase: TypedSupabaseClient,
    protected readonly tableName: string,
  ) {}

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
    return this.query(async () => {
      let builder = this.supabase.from(this.tableName).select('*');
      if (query) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        builder = query(builder as any) as any;
      }
      return await builder;
    });
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<ApiResponse<TEntity>> {
    return this.query(async () => {
      return await this.supabase.from(this.tableName).select('*').eq('id', id).single();
    });
  }

  /**
   * Create a new record
   */
  async create(dto: TCreateDto): Promise<ApiResponse<TEntity>> {
    return this.query(async () => {
      return await this.supabase
        .from(this.tableName)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(dto as any)
        .select()
        .single();
    });
  }

  /**
   * Create multiple records
   */
  async createMany(dtos: TCreateDto[]): Promise<ApiResponse<TEntity[]>> {
    return this.query(async () => {
      return await this.supabase
        .from(this.tableName)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(dtos as any)
        .select();
    });
  }

  /**
   * Update a record by ID
   */
  async update(id: string, dto: TUpdateDto): Promise<ApiResponse<TEntity>> {
    return this.query(async () => {
      return await this.supabase
        .from(this.tableName)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(dto as any)
        .eq('id', id)
        .select()
        .single();
    });
  }

  /**
   * Upsert a record
   */
  async upsert(dto: Partial<TEntity>): Promise<ApiResponse<TEntity>> {
    return this.query(async () => {
      return await this.supabase
        .from(this.tableName)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(dto as any)
        .select()
        .single();
    });
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return this.query(async () => {
      const { error } = await this.supabase.from(this.tableName).delete().eq('id', id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { data: null as any, error };
    });
  }

  /**
   * Execute a custom query
   */
  protected async execute<T>(
    operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  ): Promise<ApiResponse<T>> {
    return this.query(operation);
  }
}
