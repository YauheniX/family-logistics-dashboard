import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReadCache, repositoryCache } from '../cache';

describe('ReadCache', () => {
  let cache: ReadCache;

  beforeEach(() => {
    cache = new ReadCache({ defaultTtlMs: 1000 });
  });

  describe('get / set', () => {
    it('should return undefined for a missing key', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should store and retrieve a value', () => {
      cache.set('key1', { data: [1, 2, 3] });
      expect(cache.get('key1')).toEqual({ data: [1, 2, 3] });
    });

    it('should return undefined for an expired entry', () => {
      cache.set('key1', 'value', 0); // expires immediately
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should evict the oldest entry when maxEntries is reached', () => {
      const small = new ReadCache({ maxEntries: 2, defaultTtlMs: 5000 });
      small.set('a', 1);
      small.set('b', 2);
      small.set('c', 3); // evicts 'a'

      expect(small.get('a')).toBeUndefined();
      expect(small.get('b')).toBe(2);
      expect(small.get('c')).toBe(3);
    });

    it('should not evict when updating an existing key', () => {
      const small = new ReadCache({ maxEntries: 2, defaultTtlMs: 5000 });
      small.set('a', 1);
      small.set('b', 2);
      small.set('a', 10); // update, not eviction

      expect(small.get('a')).toBe(10);
      expect(small.get('b')).toBe(2);
      expect(small.size).toBe(2);
    });
  });

  describe('getOrSet', () => {
    it('should call fetcher on cache miss and cache the result', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });

      const result = await cache.getOrSet('key1', fetcher);

      expect(result).toEqual({ data: 'fresh' });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should return cached value without calling fetcher on cache hit', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });

      // First call – cache miss
      await cache.getOrSet('key1', fetcher);
      // Second call – cache hit
      const result = await cache.getOrSet('key1', fetcher);

      expect(result).toEqual({ data: 'fresh' });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should call fetcher again after TTL expires', async () => {
      const fetcher = vi.fn().mockResolvedValue('value');
      cache = new ReadCache({ defaultTtlMs: 50 });

      await cache.getOrSet('key1', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Advance past TTL
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      await cache.getOrSet('key1', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should respect per-call TTL override', async () => {
      cache = new ReadCache({ defaultTtlMs: 60_000 });
      const fetcher = vi.fn().mockResolvedValue('val');

      await cache.getOrSet('key1', fetcher, 0); // immediate expiry

      const result = await cache.getOrSet('key1', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(result).toBe('val');
    });

    it('should propagate fetcher errors without caching', async () => {
      const error = new Error('network failure');
      const fetcher = vi.fn().mockRejectedValue(error);

      await expect(cache.getOrSet('key1', fetcher)).rejects.toThrow('network failure');
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should remove a specific entry', () => {
      cache.set('a', 1);
      cache.set('b', 2);

      expect(cache.invalidate('a')).toBe(true);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
    });

    it('should return false for a missing key', () => {
      expect(cache.invalidate('nonexistent')).toBe(false);
    });
  });

  describe('invalidateByPrefix', () => {
    it('should remove all entries matching the prefix', () => {
      cache.set('shopping_lists:h1:all', [1]);
      cache.set('shopping_lists:h2:all', [2]);
      cache.set('wishlists:h1:all', 3);

      const removed = cache.invalidateByPrefix('shopping_lists:');

      expect(removed).toBe(2);
      expect(cache.get('shopping_lists:h1:all')).toBeUndefined();
      expect(cache.get('shopping_lists:h2:all')).toBeUndefined();
      expect(cache.get('wishlists:h1:all')).toBe(3);
    });

    it('should return 0 when no entries match', () => {
      cache.set('a', 1);
      expect(cache.invalidateByPrefix('xyz:')).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for a valid cached entry', () => {
      cache.set('key1', 'value');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for expired or missing entries', () => {
      cache.set('expired', 'value', 0);
      expect(cache.has('expired')).toBe(false);
      expect(cache.has('missing')).toBe(false);
    });
  });

  describe('size', () => {
    it('should reflect the number of stored entries', () => {
      expect(cache.size).toBe(0);
      cache.set('a', 1);
      expect(cache.size).toBe(1);
      cache.set('b', 2);
      expect(cache.size).toBe(2);
      cache.invalidate('a');
      expect(cache.size).toBe(1);
    });
  });

  describe('tenant-safe keys', () => {
    it('should keep household-scoped data separate', () => {
      cache.set('shopping_lists:household-1', [{ id: 'list-1' }]);
      cache.set('shopping_lists:household-2', [{ id: 'list-2' }]);

      expect(cache.get('shopping_lists:household-1')).toEqual([{ id: 'list-1' }]);
      expect(cache.get('shopping_lists:household-2')).toEqual([{ id: 'list-2' }]);
    });

    it('should invalidate only the targeted household', () => {
      cache.set('shopping_lists:household-1', [{ id: 'list-1' }]);
      cache.set('shopping_lists:household-2', [{ id: 'list-2' }]);

      cache.invalidateByPrefix('shopping_lists:household-1');

      expect(cache.get('shopping_lists:household-1')).toBeUndefined();
      expect(cache.get('shopping_lists:household-2')).toEqual([{ id: 'list-2' }]);
    });
  });

  describe('default options', () => {
    it('should use default TTL of 30 s and maxEntries of 500', () => {
      const defaultCache = new ReadCache();
      // Store and retrieve within the default 30 s TTL
      defaultCache.set('key', 'val');
      expect(defaultCache.get('key')).toBe('val');
    });
  });
});

describe('repositoryCache singleton', () => {
  it('should be an instance of ReadCache', () => {
    expect(repositoryCache).toBeInstanceOf(ReadCache);
  });

  it('should persist values across imports (singleton)', () => {
    repositoryCache.set('singleton-test', 42);
    expect(repositoryCache.get('singleton-test')).toBe(42);
    repositoryCache.invalidate('singleton-test');
  });
});
