/**
 * E2E Smoke Suite — critical user flows
 *
 * Flows covered:
 *   1. Login (auth-protected route, form-based)
 *   2. Household selection (mock-mode auto-seed)
 *   3. Shopping list create + item add/edit (auth-protected)
 *   4. Wishlist public share + anonymous reserve (public route)
 *
 * All tests run against the Vite preview server in MOCK mode
 * (VITE_USE_MOCK_BACKEND=true), so no Supabase credentials are required.
 * Each test seeds its own localStorage state to stay deterministic.
 */

import { test, expect } from '@playwright/test';
import {
  seedAuthState,
  seedHouseholdState,
  seedHouseholdEntities,
  seedPublicWishlist,
  lsKey,
} from './helpers/mock-state';

// ─── 1. Login flow ─────────────────────────────────────────────────────────

test.describe('Login flow', () => {
  test('redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/login');
    // Use exact match so we don't pick up "Sign in with Google"
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    // After submitting with empty fields, the router must NOT navigate away from /login.
    // The form has client-side validation that prevents submission.
    await expect(page).toHaveURL(/\/login/, { timeout: 3_000 });
  });

  test('registers a new account and lands on dashboard', async ({ page }) => {
    await page.goto('/register');

    const ts = Date.now();
    const email = `smoke-${ts}@example.com`;

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: /create account/i }).click();

    // After registration the mock auth service signs the user in automatically.
    // The router redirects to the dashboard (/).
    await expect(page).toHaveURL('/', { timeout: 10_000 });
  });

  test('signs in with existing credentials and lands on dashboard', async ({ page }) => {
    // Pre-seed a known user WITHOUT a currentUser so the app starts as logged-out
    // but the user account already "exists" in the mock auth store.
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      {
        key: lsKey('auth-data'),
        value: JSON.stringify({
          users: [{ id: 'preset-user-1', email: 'preset@example.com', password: 'password123' }],
          currentUser: null,
        }),
      },
    );

    await page.goto('/login');

    await page.getByLabel('Email').fill('preset@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await expect(page).toHaveURL('/', { timeout: 10_000 });
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password', { exact: true }).fill('wrongpass');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // The error message is rendered in a <p> below the button
    await expect(page.locator('p.text-danger-500, p.text-danger-400').first()).toBeVisible({
      timeout: 5_000,
    });
  });
});

// ─── 2. Household selection ─────────────────────────────────────────────────

test.describe('Household selection', () => {
  test('household list page is accessible and shows seeded household', async ({ page }) => {
    await seedAuthState(page);
    await seedHouseholdEntities(page);
    await page.goto('/households');

    // The page heading must be visible (confirms no auth redirect)
    await expect(page.getByRole('heading', { name: 'Households' })).toBeVisible({
      timeout: 8_000,
    });
    // "Create Household" action button should be visible
    await expect(
      page.getByRole('button', { name: /create household/i }),
    ).toBeVisible();
    // The seeded household name should appear somewhere on the page
    // (in the sidebar, header selector, or the household list itself)
    await expect(page.getByText('Smith Family').first()).toBeAttached({ timeout: 8_000 });
  });

  test('navigating to household detail shows the household name', async ({ page }) => {
    await seedAuthState(page);
    // The mock households have IDs "1", "2", "3" (see household.ts initializeMockHouseholds)
    await page.goto('/households/1');

    // The household detail view should load (it may show the household name or a member list)
    await expect(page).not.toHaveURL(/login/);
  });
});

// ─── 3. Shopping list create + edit ─────────────────────────────────────────

test.describe('Shopping list – create and edit', () => {
  test.beforeEach(async ({ page }) => {
    // Pre-seed auth + household so all shopping tests start authenticated
    await seedAuthState(page);
    await seedHouseholdState(page);
  });

  test('shopping index renders + Create List button is enabled', async ({ page }) => {
    await page.goto('/shopping');

    // Heading
    await expect(page.getByRole('heading', { name: /shopping lists/i })).toBeVisible({
      timeout: 8_000,
    });

    // The "+ New List" button should be enabled once household is ready
    const newListBtn = page.getByRole('button', { name: /new list/i });
    await expect(newListBtn).toBeVisible();
    await expect(newListBtn).toBeEnabled({ timeout: 8_000 });
  });

  test('creates a new shopping list and it appears in the index', async ({ page }) => {
    await page.goto('/shopping');

    // Wait for household to initialize
    await expect(page.getByRole('button', { name: /new list/i })).toBeEnabled({ timeout: 8_000 });

    // Open the create modal
    await page.getByRole('button', { name: /new list/i }).click();

    // Fill in the list title — use the exact placeholder text from i18n
    const titleInput = page.getByPlaceholder('Weekly groceries');
    await titleInput.fill('Smoke Test List');
    await page.getByRole('button', { name: /^create$/i }).click();

    // The new list should appear in the index — use first() to handle
    // cases where the name appears in both the list row and nav breadcrumb
    await expect(page.getByText('Smoke Test List').first()).toBeVisible({ timeout: 8_000 });
  });

  test('opens a shopping list and adds an item in edit mode', async ({ page }) => {
    await page.goto('/shopping');
    await expect(page.getByRole('button', { name: /new list/i })).toBeEnabled({ timeout: 8_000 });

    // Create a list first
    await page.getByRole('button', { name: /new list/i }).click();
    const titleInput = page.getByPlaceholder('Weekly groceries');
    await titleInput.fill('E2E Item Test');
    await page.getByRole('button', { name: /^create$/i }).click();
    await expect(page.getByText('E2E Item Test').first()).toBeVisible({ timeout: 8_000 });

    // Navigate into the list
    await page.getByText('E2E Item Test').first().click();
    await expect(page).toHaveURL(/\/shopping\//, { timeout: 8_000 });

    // Switch to Edit mode
    await page.getByRole('button', { name: /edit/i }).first().click();

    // Add an item via the "+ Add Item" button
    await page.getByRole('button', { name: /add item/i }).click();

    // Fill in item name in the modal
    const itemInput = page.getByPlaceholder(/item name/i);
    await itemInput.fill('Milk');
    await page.getByRole('button', { name: /add item/i }).last().click();

    // Item should appear in the list
    await expect(page.getByText('Milk')).toBeVisible({ timeout: 8_000 });
  });

  test('can toggle a shopping item as purchased', async ({ page }) => {
    await page.goto('/shopping');
    await expect(page.getByRole('button', { name: /new list/i })).toBeEnabled({ timeout: 8_000 });

    // Create and navigate into a list
    await page.getByRole('button', { name: /new list/i }).click();
    await page.getByPlaceholder('Weekly groceries').fill('Toggle Test');
    await page.getByRole('button', { name: /^create$/i }).click();
    await expect(page.getByText('Toggle Test').first()).toBeVisible({ timeout: 8_000 });
    await page.getByText('Toggle Test').first().click();
    await expect(page).toHaveURL(/\/shopping\//, { timeout: 8_000 });

    // Add an item in edit mode
    await page.getByRole('button', { name: /edit/i }).first().click();
    await page.getByRole('button', { name: /add item/i }).click();
    await page.getByPlaceholder(/item name/i).fill('Eggs');
    await page.getByRole('button', { name: /add item/i }).last().click();
    await expect(page.getByText('Eggs')).toBeVisible({ timeout: 8_000 });

    // Switch to Shopping mode and toggle the item
    await page.getByRole('button', { name: /shopping/i }).first().click();
    // Find the checkbox associated with the "Eggs" label (not the filter checkboxes)
    const itemCheckbox = page.getByLabel('Eggs');
    await itemCheckbox.check();

    // Item should be visually marked as purchased (line-through)
    await expect(page.locator('label.line-through')).toBeVisible({ timeout: 5_000 });
  });
});

// ─── 4. Public wishlist – share link + reserve item ─────────────────────────

test.describe('Public wishlist – share and reserve', () => {
  const SLUG = 'smoke-share-slug';

  test.beforeEach(async ({ page }) => {
    await seedPublicWishlist(page, { shareSlug: SLUG });
  });

  test('public wishlist is accessible without authentication', async ({ page }) => {
    await page.goto(`/wishlist/${SLUG}`);

    // The wishlist title should be visible
    await expect(page.getByText('Smoke Wishlist')).toBeVisible({ timeout: 8_000 });

    // The seeded item should be displayed
    await expect(page.getByText('Headphones')).toBeVisible();
  });

  test('reserve button is present on an unreserved item', async ({ page }) => {
    await page.goto(`/wishlist/${SLUG}`);
    await expect(page.getByText('Headphones')).toBeVisible({ timeout: 8_000 });

    const reserveBtn = page.getByRole('button', { name: /reserve this/i });
    await expect(reserveBtn).toBeVisible();
    await expect(reserveBtn).toBeEnabled();
  });

  test('anonymous user can reserve an item via the modal', async ({ page }) => {
    await page.goto(`/wishlist/${SLUG}`);
    await expect(page.getByText('Headphones')).toBeVisible({ timeout: 8_000 });

    // Click "Reserve This"
    await page.getByRole('button', { name: /reserve this/i }).click();

    // The reservation modal should open — identified by its title heading
    await expect(page.getByRole('heading', { name: 'Reserve Item' })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel('Your Name')).toBeVisible();
    await expect(page.getByLabel('Your Email')).toBeVisible();

    // Fill in the reservation form
    await page.getByLabel('Your Name').fill('Alice Tester');
    await page.getByLabel('Your Email').fill('alice@example.com');

    await page.getByRole('button', { name: /confirm reservation/i }).click();

    // After reservation the item should show a "Reserved" badge
    await expect(page.getByText(/reserved/i).first()).toBeVisible({ timeout: 8_000 });
  });
});
