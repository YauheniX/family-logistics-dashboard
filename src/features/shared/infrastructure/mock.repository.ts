/**
 * Mock repository base class for frontend-only mode
 * Simulates Supabase behavior using localStorage
 */

import type { ApiResponse, QueryBuilder } from '../domain/repository.interface';
import { createStorageAdapter, type StorageAdapter } from './mock-storage.adapter';

export interface MockEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Generate a UUID v4
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Base mock repository for local storage operations
 */
export abstract class MockRepository<
  TEntity extends MockEntity,
  TCreateDto = Partial<TEntity>,
  TUpdateDto = Partial<TEntity>,
> {
  protected readonly storage: StorageAdapter;
  protected readonly tableName: string;

  constructor(tableName: string, storage?: StorageAdapter) {
    this.tableName = tableName;
    this.storage = storage ?? createStorageAdapter();
  }

  /**
   * Get storage key for table
   */
  private getTableKey(): string {
    return `table:${this.tableName}`;
  }

  /**
   * Load all records from storage
   */
  protected async loadAll(): Promise<TEntity[]> {
    const data = await this.storage.get<TEntity[]>(this.getTableKey());
    return data ?? [];
  }

  /**
   * Save all records to storage
   */
  protected async saveAll(data: TEntity[]): Promise<void> {
    await this.storage.set(this.getTableKey(), data);
  }

  /**
   * Apply query filters (simplified version)
   */
  protected applyFilters(data: TEntity[], _query?: QueryBuilder): TEntity[] {
    // In a real implementation, this would parse and apply the query builder
    // For now, we return all data and let specific repositories override
    return data;
  }

  /**
   * Find all records
   */
  async findAll(query?: QueryBuilder): Promise<ApiResponse<TEntity[]>> {
    try {
      const data = await this.loadAll();
      const filtered = this.applyFilters(data, query);
      return { data: filtered, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch data',
        },
      };
    }
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<ApiResponse<TEntity>> {
    try {
      const data = await this.loadAll();
      const item = data.find((record) => record.id === id);

      if (!item) {
        return {
          data: null,
          error: { message: `Record with id ${id} not found` },
        };
      }

      return { data: item, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch record',
        },
      };
    }
  }

  /**
   * Create a new record
   */
  async create(dto: TCreateDto): Promise<ApiResponse<TEntity>> {
    try {
      const data = await this.loadAll();
      const now = new Date().toISOString();

      const newRecord = {
        ...dto,
        id: generateId(),
        created_at: now,
        updated_at: now,
      } as unknown as TEntity;

      data.push(newRecord);
      await this.saveAll(data);

      return { data: newRecord, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to create record',
        },
      };
    }
  }

  /**
   * Create multiple records
   */
  async createMany(dtos: TCreateDto[]): Promise<ApiResponse<TEntity[]>> {
    try {
      const data = await this.loadAll();
      const now = new Date().toISOString();

      const newRecords = dtos.map(
        (dto) =>
          ({
            ...dto,
            id: generateId(),
            created_at: now,
            updated_at: now,
          }) as unknown as TEntity,
      );

      data.push(...newRecords);
      await this.saveAll(data);

      return { data: newRecords, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to create records',
        },
      };
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string, dto: TUpdateDto): Promise<ApiResponse<TEntity>> {
    try {
      const data = await this.loadAll();
      const index = data.findIndex((record) => record.id === id);

      if (index === -1) {
        return {
          data: null,
          error: { message: `Record with id ${id} not found` },
        };
      }

      const updated = {
        ...data[index],
        ...dto,
        updated_at: new Date().toISOString(),
      } as TEntity;

      data[index] = updated;
      await this.saveAll(data);

      return { data: updated, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update record',
        },
      };
    }
  }

  /**
   * Upsert a record
   */
  async upsert(dto: Partial<TEntity>): Promise<ApiResponse<TEntity>> {
    try {
      const data = await this.loadAll();
      const id = (dto as TEntity).id;

      if (!id) {
        return await this.create(dto as TCreateDto);
      }

      const index = data.findIndex((record) => record.id === id);

      if (index === -1) {
        return await this.create(dto as TCreateDto);
      }

      return await this.update(id, dto as TUpdateDto);
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to upsert record',
        },
      };
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const data = await this.loadAll();
      const filtered = data.filter((record) => record.id !== id);

      if (filtered.length === data.length) {
        return {
          data: null,
          error: { message: `Record with id ${id} not found` },
        };
      }

      await this.saveAll(filtered);
      return { data: undefined as void, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to delete record',
        },
      };
    }
  }
}
