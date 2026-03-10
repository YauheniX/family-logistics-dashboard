import type { Page } from '@playwright/test';

/**
 * LocalStorage key prefix used by the mock storage adapter.
 * Matches LocalStorageAdapter prefix in mock-storage.adapter.ts.
 */
const LS_PREFIX = 'family-logistics';

/**
 * Build the full localStorage key as the LocalStorageAdapter does.
 */
export function lsKey(key: string): string {
  return `${LS_PREFIX}:${key}`;
}

/**
 * Seed data that represents a fully signed-in mock user with one household.
 *
 * The auth-data shape is owned by MockAuthService (auth.service.mock.ts).
 * The shopping/wishlist data shapes are owned by their respective mock
 * repositories (mock.repository.ts).
 */
export interface SeedOptions {
  email?: string;
  password?: string;
  userId?: string;
  householdId?: string;
  householdName?: string;
}

const DEFAULTS: Required<SeedOptions> = {
  email: 'smoke@example.com',
  password: 'password123',
  userId: 'smoke-user-1',
  householdId: 'smoke-household-1',
  householdName: 'Smith Family',
};

/**
 * Inject a pre-authenticated mock state into localStorage so tests can skip
 * the login form and start from a known, stable baseline.
 *
 * Call this inside a `page.addInitScript` or `page.evaluate` before
 * navigating to a protected route.
 */
export async function seedAuthState(page: Page, opts: SeedOptions = {}): Promise<void> {
  const { email, password, userId } = { ...DEFAULTS, ...opts };

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    {
      key: lsKey('auth-data'),
      value: JSON.stringify({
        users: [{ id: userId, email, password }],
        currentUser: { id: userId, email },
      }),
    },
  );
}

/**
 * Seed the current-household selection in localStorage so the household store
 * restores it synchronously on page load (mirrors household.ts _restoreFromLocalStorage).
 */
export async function seedHouseholdState(page: Page, opts: SeedOptions = {}): Promise<void> {
  const { householdId, householdName } = { ...DEFAULTS, ...opts };

  await page.addInitScript(
    ({ id, name }) => {
      // NOTE: The household store (stores/household.ts) reads/writes these keys
      // directly via raw `localStorage` calls (no prefix), so we intentionally
      // do NOT use the `lsKey()` helper here.
      localStorage.setItem('current_household_id', id);
      localStorage.setItem('current_household_name', name);
      localStorage.setItem('current_household_slug', id);
      localStorage.setItem('current_household_role', 'owner');
    },
    { id: householdId, name: householdName },
  );
}

/**
 * Seed household entity records into the mock household repository so the
 * HouseholdListView (which uses householdEntityStore) can render them.
 *
 * Table name: mock_households (MockHouseholdRepository)
 */
export async function seedHouseholdEntities(
  page: Page,
  opts: { userId?: string; householdId?: string; householdName?: string } = {},
): Promise<void> {
  const userId = opts.userId ?? DEFAULTS.userId;
  const householdId = opts.householdId ?? DEFAULTS.householdId;
  const householdName = opts.householdName ?? DEFAULTS.householdName;

  const household = {
    id: householdId,
    name: householdName,
    slug: householdId,
    created_at: '2024-01-01T00:00:00Z',
    created_by: userId,
  };

  const member = {
    id: `${householdId}-member-1`,
    household_id: householdId,
    user_id: userId,
    role: 'owner',
    is_active: true,
    display_name: 'Smoke User',
    created_at: '2024-01-01T00:00:00Z',
  };

  await page.addInitScript(
    ({ hhKey, memberKey, hh, m }) => {
      localStorage.setItem(hhKey, JSON.stringify([hh]));
      localStorage.setItem(memberKey, JSON.stringify([m]));
    },
    {
      hhKey: lsKey('table:mock_households'),
      memberKey: lsKey('table:mock_household_members'),
      hh: household,
      m: member,
    },
  );
}

/**
 * Seed a public wishlist into the mock wishlist repository storage so the
 * public wishlist route can render it without a real backend.
 *
 * The mock repository stores data under the key pattern:
 *   family-logistics:table:<tableName>
 * where tableName comes from MockWishlistRepository ("mock_wishlists") and
 * MockWishlistItemRepository ("mock_wishlist_items").
 */
export async function seedPublicWishlist(
  page: Page,
  opts: {
    wishlistId?: string;
    shareSlug?: string;
    title?: string;
    userId?: string;
    householdId?: string;
  } = {},
): Promise<void> {
  const wishlistId = opts.wishlistId ?? 'smoke-wishlist-1';
  const shareSlug = opts.shareSlug ?? 'smoke-share-slug';
  const title = opts.title ?? 'Smoke Wishlist';
  const userId = opts.userId ?? DEFAULTS.userId;
  const householdId = opts.householdId ?? DEFAULTS.householdId;

  const wishlistItem = {
    id: 'smoke-item-1',
    wishlist_id: wishlistId,
    title: 'Headphones',
    description: 'Over-ear noise cancelling',
    link: null,
    price: 99.99,
    currency: 'USD',
    priority: 'high',
    is_reserved: false,
    reserved_by_email: null,
    reserved_by_name: null,
    reserved_at: null,
    created_at: '2024-01-01T00:00:00Z',
  };

  await page.addInitScript(
    ({ wlKey, itemKey, wishlist, item }) => {
      localStorage.setItem(wlKey, JSON.stringify([wishlist]));
      localStorage.setItem(itemKey, JSON.stringify([item]));
    },
    {
      // Keys follow the pattern LocalStorageAdapter uses: `${prefix}:${storageKey}`
      // where storageKey inside MockRepository is `table:${tableName}`.
      wlKey: lsKey('table:mock_wishlists'),
      itemKey: lsKey('table:mock_wishlist_items'),
      wishlist: {
        id: wishlistId,
        user_id: userId,
        household_id: householdId,
        title,
        description: null,
        is_public: true,
        visibility: 'public',
        share_slug: shareSlug,
        created_at: '2024-01-01T00:00:00Z',
      },
      item: wishlistItem,
    },
  );
}
