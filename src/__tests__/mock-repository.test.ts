import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockRepository, type MockEntity } from '@/features/shared/infrastructure/mock.repository';
import { InMemoryAdapter } from '@/features/shared/infrastructure/mock-storage.adapter';

interface TestEntity extends MockEntity {
  name: string;
  value?: number;
}

type TestCreateDto = Partial<TestEntity>;
type TestUpdateDto = Partial<TestEntity>;

class TestRepository extends MockRepository<TestEntity, TestCreateDto, TestUpdateDto> {
  constructor(storage: InMemoryAdapter) {
    super('test_entities', storage);
  }
}

describe('MockRepository', () => {
  let storage: InMemoryAdapter;
  let repo: TestRepository;

  beforeEach(async () => {
    storage = new InMemoryAdapter();
    await storage.clear();
    repo = new TestRepository(storage);
  });

  describe('create', () => {
    it('should create a record with auto-generated id, created_at, and updated_at', async () => {
      const result = await repo.create({ name: 'Test Item' });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.name).toBe('Test Item');
      expect(result.data!.id).toBeDefined();
      expect(result.data!.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(result.data!.created_at).toBeDefined();
      expect(result.data!.updated_at).toBeDefined();
    });

    it('should persist the created record', async () => {
      await repo.create({ name: 'Persisted' });

      const all = await repo.findAll();
      expect(all.data).toHaveLength(1);
      expect(all.data![0].name).toBe('Persisted');
    });
  });

  describe('createMany', () => {
    it('should create multiple records', async () => {
      const result = await repo.createMany([
        { name: 'Item 1' },
        { name: 'Item 2' },
        { name: 'Item 3' },
      ]);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(3);
      expect(result.data![0].name).toBe('Item 1');
      expect(result.data![1].name).toBe('Item 2');
      expect(result.data![2].name).toBe('Item 3');
    });

    it('should assign unique ids to each record', async () => {
      const result = await repo.createMany([{ name: 'A' }, { name: 'B' }]);

      expect(result.data![0].id).not.toBe(result.data![1].id);
    });

    it('should set created_at and updated_at on all records', async () => {
      const result = await repo.createMany([{ name: 'A' }, { name: 'B' }]);

      for (const record of result.data!) {
        expect(record.created_at).toBeDefined();
        expect(record.updated_at).toBeDefined();
      }
    });
  });

  describe('findAll', () => {
    it('should return empty array when no records exist', async () => {
      const result = await repo.findAll();

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('should return all records', async () => {
      await repo.create({ name: 'First' });
      await repo.create({ name: 'Second' });

      const result = await repo.findAll();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should return a record by id', async () => {
      const created = await repo.create({ name: 'Find Me' });
      const id = created.data!.id;

      const result = await repo.findById(id);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.name).toBe('Find Me');
    });

    it('should return error when record not found', async () => {
      const result = await repo.findById('non-existent-id');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.message).toContain('not found');
    });
  });

  describe('update', () => {
    it('should update an existing record', async () => {
      const created = await repo.create({ name: 'Original', value: 1 });
      const id = created.data!.id;

      const result = await repo.update(id, { name: 'Updated', value: 42 });

      expect(result.error).toBeNull();
      expect(result.data!.name).toBe('Updated');
      expect(result.data!.value).toBe(42);
      expect(result.data!.id).toBe(id);
    });

    it('should set a new updated_at timestamp', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const created = await repo.create({ name: 'Original' });
      const id = created.data!.id;

      vi.setSystemTime(new Date('2024-01-02T00:00:00.000Z'));
      const result = await repo.update(id, { name: 'Updated' });

      expect(result.data!.updated_at).toBe('2024-01-02T00:00:00.000Z');
      expect(result.data!.updated_at).not.toBe(created.data!.updated_at);

      vi.useRealTimers();
    });

    it('should return error when record not found', async () => {
      const result = await repo.update('non-existent-id', { name: 'Nope' });

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.message).toContain('not found');
    });

    it('should persist the update', async () => {
      const created = await repo.create({ name: 'Before' });
      const id = created.data!.id;

      await repo.update(id, { name: 'After' });

      const fetched = await repo.findById(id);
      expect(fetched.data!.name).toBe('After');
    });
  });

  describe('upsert', () => {
    it('should create when no id is provided', async () => {
      const result = await repo.upsert({ name: 'New via upsert' });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.id).toBeDefined();
      expect(result.data!.name).toBe('New via upsert');
    });

    it('should create when id does not exist', async () => {
      const result = await repo.upsert({ id: 'non-existent-id', name: 'Created by upsert' });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data!.name).toBe('Created by upsert');
    });

    it('should update when id exists', async () => {
      const created = await repo.create({ name: 'Original' });
      const id = created.data!.id;

      const result = await repo.upsert({ id, name: 'Upserted' });

      expect(result.error).toBeNull();
      expect(result.data!.name).toBe('Upserted');
      expect(result.data!.id).toBe(id);
    });
  });

  describe('delete', () => {
    it('should delete an existing record', async () => {
      const created = await repo.create({ name: 'Delete Me' });
      const id = created.data!.id;

      const result = await repo.delete(id);

      expect(result.error).toBeNull();

      const all = await repo.findAll();
      expect(all.data).toHaveLength(0);
    });

    it('should return error when record not found', async () => {
      const result = await repo.delete('non-existent-id');

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error!.message).toContain('not found');
    });

    it('should only delete the specified record', async () => {
      await repo.create({ name: 'Keep' });
      const toDelete = await repo.create({ name: 'Remove' });

      await repo.delete(toDelete.data!.id);

      const all = await repo.findAll();
      expect(all.data).toHaveLength(1);
      expect(all.data![0].name).toBe('Keep');
    });
  });

  describe('applyFilters', () => {
    it('should return all data by default (no filtering)', async () => {
      await repo.create({ name: 'A' });
      await repo.create({ name: 'B' });

      const result = await repo.findAll(undefined);

      expect(result.data).toHaveLength(2);
    });

    it('should pass through query parameter without altering results', async () => {
      await repo.create({ name: 'A' });
      await repo.create({ name: 'B' });

      const queryBuilder = (builder: unknown) => builder;
      const result = await repo.findAll(queryBuilder);

      expect(result.data).toHaveLength(2);
    });
  });
});
