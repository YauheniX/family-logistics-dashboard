import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalStorageAdapter,
  InMemoryAdapter,
  createStorageAdapter,
} from '@/features/shared/infrastructure/mock-storage.adapter';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter('test');
  });

  it('stores and retrieves a value', async () => {
    await adapter.set('key1', { value: 42 });
    const result = await adapter.get<{ value: number }>('key1');

    expect(result).toEqual({ value: 42 });
  });

  it('returns null for missing key', async () => {
    const result = await adapter.get('nonexistent');

    expect(result).toBeNull();
  });

  it('returns null when stored value is invalid JSON', async () => {
    localStorage.setItem('test:bad-key', 'not-valid-json{');
    const result = await adapter.get('bad-key');

    expect(result).toBeNull();
  });

  it('removes a key', async () => {
    await adapter.set('key1', 'value');
    await adapter.remove('key1');
    const result = await adapter.get('key1');

    expect(result).toBeNull();
  });

  it('clears all keys with the adapter prefix', async () => {
    await adapter.set('a', 1);
    await adapter.set('b', 2);
    await adapter.clear();

    expect(await adapter.get('a')).toBeNull();
    expect(await adapter.get('b')).toBeNull();
  });

  it('returns only keys belonging to this adapter prefix', async () => {
    await adapter.set('x', 1);
    await adapter.set('y', 2);
    localStorage.setItem('other:z', '3');

    const keys = await adapter.keys();

    expect(keys).toContain('x');
    expect(keys).toContain('y');
    expect(keys).not.toContain('z');
  });
});

describe('InMemoryAdapter', () => {
  let adapter: InMemoryAdapter;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
  });

  it('stores and retrieves a value', async () => {
    await adapter.set('key1', { name: 'test' });
    const result = await adapter.get<{ name: string }>('key1');

    expect(result).toEqual({ name: 'test' });
  });

  it('returns null for missing key', async () => {
    const result = await adapter.get('missing');

    expect(result).toBeNull();
  });

  it('returns null when stored value is invalid JSON', async () => {
    // Directly corrupt internal state to simulate parse failure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adapter as any).storage.set('corrupt', '{invalid}');
    const result = await adapter.get('corrupt');

    expect(result).toBeNull();
  });

  it('removes a key', async () => {
    await adapter.set('key1', 'val');
    await adapter.remove('key1');

    expect(await adapter.get('key1')).toBeNull();
  });

  it('clears all keys', async () => {
    await adapter.set('a', 1);
    await adapter.set('b', 2);
    await adapter.clear();

    expect(await adapter.keys()).toHaveLength(0);
  });

  it('returns all keys', async () => {
    await adapter.set('x', 1);
    await adapter.set('y', 2);
    const keys = await adapter.keys();

    expect(keys).toContain('x');
    expect(keys).toContain('y');
  });
});

describe('createStorageAdapter', () => {
  it('returns a storage adapter', () => {
    const adapter = createStorageAdapter();

    expect(adapter).toBeDefined();
    expect(adapter.get).toBeTypeOf('function');
    expect(adapter.set).toBeTypeOf('function');
  });
});
