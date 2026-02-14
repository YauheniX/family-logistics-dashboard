import { supabase } from './supabaseClient';
import type { ApiResponse, ApiError } from '@/types/api';
import type { PostgrestError } from '@supabase/supabase-js';

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
 * Wrapper for Supabase database queries with unified error handling
 */
export class SupabaseService {
  /**
   * Execute a query and return a typed response with error handling
   */
  static async query<T>(
    operation: () => Promise<{ data: T | null; error: PostgrestError | null }>
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
   * Fetch multiple records
   */
  static async select<T>(
    table: string,
    query?: (builder: any) => any
  ): Promise<ApiResponse<T[]>> {
    return this.query(async () => {
      let builder = supabase.from(table).select('*');
      if (query) {
        builder = query(builder);
      }
      return await builder;
    });
  }

  /**
   * Fetch a single record
   */
  static async selectSingle<T>(
    table: string,
    query?: (builder: any) => any
  ): Promise<ApiResponse<T>> {
    return this.query(async () => {
      let builder = supabase.from(table).select('*');
      if (query) {
        builder = query(builder);
      }
      return await builder.single();
    });
  }

  /**
   * Insert a record
   */
  static async insert<T>(
    table: string,
    data: Partial<T> | Partial<T>[]
  ): Promise<ApiResponse<T>> {
    return this.query(async () => {
      return await supabase
        .from(table)
        .insert(data)
        .select()
        .single();
    });
  }

  /**
   * Insert multiple records
   */
  static async insertMany<T>(
    table: string,
    data: Partial<T>[]
  ): Promise<ApiResponse<T[]>> {
    return this.query(async () => {
      return await supabase
        .from(table)
        .insert(data)
        .select();
    });
  }

  /**
   * Update a record
   */
  static async update<T>(
    table: string,
    id: string,
    data: Partial<T>
  ): Promise<ApiResponse<T>> {
    return this.query(async () => {
      return await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();
    });
  }

  /**
   * Upsert a record
   */
  static async upsert<T>(
    table: string,
    data: Partial<T> | Partial<T>[]
  ): Promise<ApiResponse<T>> {
    return this.query(async () => {
      return await supabase
        .from(table)
        .upsert(data)
        .select()
        .single();
    });
  }

  /**
   * Delete a record
   */
  static async delete(table: string, id: string): Promise<ApiResponse<null>> {
    return this.query(async () => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      return { data: null, error };
    });
  }

  /**
   * Execute a custom query
   */
  static async execute<T>(
    operation: () => Promise<{ data: T | null; error: PostgrestError | null }>
  ): Promise<ApiResponse<T>> {
    return this.query(operation);
  }
}
