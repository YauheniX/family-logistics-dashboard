# Read Cache

The application includes a lightweight, in-memory read cache that sits between
the Pinia stores and the Supabase backend. It reduces redundant network
requests for frequently-accessed, read-heavy endpoints (dashboard lists,
member lookups, wishlists) while keeping the repository pattern intact.

## Location

| File                                                    | Purpose                                                              |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/utils/cache.ts`                                    | `ReadCache` class + `repositoryCache` singleton                      |
| `src/features/shared/infrastructure/base.repository.ts` | `cachedQuery`, `cacheKey`, `invalidateTable`, `writeThrough` helpers |

## How It Works

### Read Path (cache hit)

```
Store → Repository.findByHouseholdId(hId)
  → cachedQuery(key, fetcher)
    → cache.get(key)          ← HIT → return cached ApiResponse
```

### Read Path (cache miss)

```
Store → Repository.findByHouseholdId(hId)
  → cachedQuery(key, fetcher)
    → cache.get(key)          ← MISS
    → fetcher()               ← calls Supabase
    → cache.set(key, result)  ← store on success only
    → return ApiResponse
```

### Write Path (automatic invalidation)

```
Store → Repository.create(dto)
  → writeThrough(operation)
    → query(operation)         ← calls Supabase
    → invalidateTable()        ← clears all entries for this table
    → return ApiResponse
```

## Cache Keys

Keys are built with `BaseRepository.cacheKey(...segments)` using the pattern:

```
<tableName>:<segment1>:<segment2>:...
```

Examples:

| Repository Method                                    | Cache Key                           |
| ---------------------------------------------------- | ----------------------------------- |
| `ShoppingListRepo.findByHouseholdId('h1')`           | `shopping_lists:household:h1`       |
| `ShoppingItemRepo.findByListId('l1')`                | `shopping_items:list:l1`            |
| `WishlistRepo.findByUserId('u1')`                    | `wishlists:user:u1`                 |
| `WishlistRepo.findByUserIdAndHouseholdId('u1','h1')` | `wishlists:user-household:u1:h1`    |
| `WishlistRepo.findByHouseholdId('h1','u2')`          | `wishlists:household:h1:exclude:u2` |
| `WishlistRepo.findChildrenWishlists('u1','h1')`      | `wishlists:children:u1:h1`          |
| `WishlistItemRepo.findByWishlistId('w1')`            | `wishlist_items:wishlist:w1`        |
| `HouseholdRepo.findByUserId('u1')`                   | `households:user:u1`                |
| `MemberRepo.findByHouseholdId('h1')`                 | `members:household:h1`              |
| `MemberRepo.getMembersWithProfiles('h1')`            | `members:profiles:h1`               |
| `UserProfileRepo.findById('u1')`                     | `user_profiles:id:u1`               |
| `BaseRepository.findById('x')`                       | `<table>:id:x`                      |

Because the household/user/list ID is part of the key, **data from different
tenants is never mixed** — each household's data lives under its own key
namespace.

## Tenant Safety

The cache is **tenant-safe by design**:

- All cache keys include the household ID (or equivalent tenant identifier).
- `invalidateTable()` removes entries by table-name prefix, so a write to
  `shopping_lists` only clears `shopping_lists:*` — not wishlists or members.
- On logout, stores call `$reset()` and the cache should be cleared via
  `repositoryCache.clear()`.

## Configuration

`ReadCache` accepts optional configuration:

| Option         | Default         | Description                                 |
| -------------- | --------------- | ------------------------------------------- |
| `defaultTtlMs` | `30 000` (30 s) | Time-to-live for each entry                 |
| `maxEntries`   | `500`           | Maximum cached entries (LRU-style eviction) |

The shared `repositoryCache` singleton uses the defaults.

Individual `cachedQuery` calls can pass a custom TTL:

```ts
return this.cachedQuery(key, fetcher, 60_000); // 60 s TTL
```

## Invalidation Strategy

| Trigger                                                     | Scope                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `create` / `createMany`                                     | All entries for the table (`tableName:*`)                                         |
| `update`                                                    | All entries for the table                                                         |
| `upsert`                                                    | All entries for the table                                                         |
| `delete`                                                    | All entries for the table                                                         |
| Feature-specific writes (e.g. `reserveItem`, `createChild`) | All entries for the table                                                         |
| Manual                                                      | `repositoryCache.invalidate(key)` or `repositoryCache.invalidateByPrefix(prefix)` |

**Error responses are never cached.** Only successful `ApiResponse` objects
(where `error === null`) are stored.

## Caveats

1. **In-memory only** — the cache is lost on page refresh. This is intentional;
   Supabase RLS ensures data is always fresh after a reload.

2. **No cross-tab sync** — if a user has two tabs open, a write in one tab
   does not invalidate the cache in the other. This is acceptable because the
   TTL is short (30 s) and the next navigation/fetch will refresh.

3. **Broad invalidation** — writes invalidate _all_ entries for the affected
   table, not just the specific household. This is a deliberate trade-off for
   simplicity; a more granular approach can be added later if profiling shows
   it's needed.

4. **Tests must clear the cache** — because `repositoryCache` is a singleton,
   test files that create repository instances should call
   `repositoryCache.clear()` in their `beforeEach` block to avoid cross-test
   interference.

## API Reference

```ts
import { ReadCache, repositoryCache } from '@/utils/cache';

// Create a custom cache
const cache = new ReadCache({ defaultTtlMs: 10_000, maxEntries: 100 });

cache.set(key, value);           // store
cache.get<T>(key);               // retrieve (undefined on miss/expiry)
cache.has(key);                  // check existence
cache.invalidate(key);           // remove one entry
cache.invalidateByPrefix('tbl:'); // remove by prefix
cache.clear();                   // remove all
cache.size;                      // entry count

// Async helper
const val = await cache.getOrSet(key, fetcherFn, ttlMs?);
```
