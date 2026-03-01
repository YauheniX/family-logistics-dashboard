/**
 * Application-level read cache for repository methods.
 *
 * Provides TTL-based caching with explicit invalidation support.
 * Cache keys are designed to be tenant-safe (household-aware) when
 * callers include the household ID in the key.
 *
 * @example
 * ```ts
 * const cache = new ReadCache({ defaultTtlMs: 30_000 });
 *
 * // Cache a read operation
 * const result = await cache.getOrSet(
 *   'shopping_lists:h1',
 *   () => supabase.from('shopping_lists').select('*').eq('household_id', 'h1'),
 * );
 *
 * // Invalidate on write
 * cache.invalidate('shopping_lists:h1');
 *
 * // Invalidate all keys matching a prefix
 * cache.invalidateByPrefix('shopping_lists:');
 * ```
 */

export interface ReadCacheOptions {
  /** Default time-to-live in milliseconds. Defaults to 30 000 (30 s). */
  defaultTtlMs?: number;
  /** Maximum number of entries. Oldest entries are evicted when exceeded. Defaults to 500. */
  maxEntries?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class ReadCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;

  constructor(options: ReadCacheOptions = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? 30_000;
    this.maxEntries = options.maxEntries ?? 500;
  }

  /**
   * Return a cached value if present and not expired, otherwise call `fetcher`,
   * store the result, and return it.
   *
   * @param key   - Cache key. Include tenant/household ID for tenant isolation.
   * @param fetcher - Async function that produces the value on a cache miss.
   * @param ttlMs - Optional per-call TTL override (milliseconds).
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Retrieve a cached value. Returns `undefined` on miss or expiry.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Manually set a cache entry.
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    // Evict oldest entry when at capacity (Map iterates in insertion order)
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  /**
   * Remove a specific cache entry.
   */
  invalidate(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Remove all entries whose key starts with `prefix`.
   * Useful for invalidating all data belonging to a table or household.
   *
   * @returns Number of entries removed.
   */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Remove all entries from the cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Current number of (possibly expired) entries.
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Check whether a non-expired entry exists for `key`.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
}

/**
 * Shared singleton cache instance used by all repositories.
 * Repositories build tenant-safe keys by including household/entity IDs.
 */
export const repositoryCache = new ReadCache();
