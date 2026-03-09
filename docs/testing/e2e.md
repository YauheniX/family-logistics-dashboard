# 🎭 E2E Smoke Tests

End-to-end smoke tests for the critical user flows in the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Overview

The E2E suite uses **[Playwright](https://playwright.dev/)** and runs against a local Vite
preview server configured in **mock mode** (`VITE_USE_MOCK_BACKEND=true`).  No real Supabase
instance or network connectivity is required; all data is persisted to `localStorage` via the
mock backend.

### Flows Covered

| # | Flow | Route(s) | Auth Required |
|---|------|----------|---------------|
| 1 | Login / Register | `/login`, `/register` | No |
| 2 | Household selection | `/households` | Yes (mock) |
| 3 | Shopping list create + item add/edit | `/shopping`, `/shopping/:listId` | Yes (mock) |
| 4 | Public wishlist share + anonymous reserve | `/wishlist/:shareSlug` | No |

---

## Prerequisites

```bash
# Install project dependencies (includes @playwright/test)
npm ci

# Install Chromium browser binary (only needed once per machine)
npx playwright install chromium --with-deps
```

---

## Running Locally

### Quickstart (against production build)

```bash
# 1. Build the app in mock mode
VITE_USE_MOCK_BACKEND=true npm run build

# 2. Run the full smoke suite (headless)
npm run test:e2e

# 3. Open the HTML report after the run
npm run test:e2e:report
```

### Against the dev-server (faster iteration)

```bash
# Terminal 1 – start the dev server
VITE_USE_MOCK_BACKEND=true npm run dev

# Terminal 2 – run tests pointing at the dev server
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run test:e2e
```

### Headed mode (see the browser)

```bash
npm run test:e2e:headed
```

### Single test file / grep

```bash
# Run only the shopping tests
npx playwright test --grep "Shopping list"

# Run a single test by title
npx playwright test --grep "creates a new shopping list"
```

---

## Project Structure

```
e2e/
├── smoke.spec.ts           # All smoke scenarios
└── helpers/
    └── mock-state.ts       # localStorage seed helpers
playwright.config.ts        # Playwright configuration
```

### `e2e/helpers/mock-state.ts`

Provides three seed helpers used in `beforeEach` hooks:

| Helper | Purpose |
|--------|---------|
| `seedAuthState(page, opts?)` | Pre-seeds a mock authenticated user so tests skip the login form |
| `seedHouseholdState(page, opts?)` | Persists the active household to localStorage for instant household context |
| `seedPublicWishlist(page, opts?)` | Seeds a public wishlist + item so the public route renders without a backend |

---

## CI Integration

The E2E suite runs in a **separate, non-blocking** GitHub Actions workflow
(`.github/workflows/e2e.yml`).  A failure in the E2E job does **not** block PR merges;
it is surfaced as a warning alongside an uploaded Playwright HTML report artifact.

### Path to Blocking

1. Allow the suite to accumulate data over several sprints.
2. Review the uploaded `playwright-report` artifacts; aim for a flake rate < 2 % over 30 runs.
3. Once stable, remove `continue-on-error: true` from the `e2e` job in `e2e.yml`.
4. Add `needs: e2e` to the `deploy` job in `deploy.yml` to gate releases on the smoke suite.

---

## Selector Strategy

Tests prefer stable, accessibility-aware Playwright locators:

| Strategy | Example | When to Use |
|----------|---------|-------------|
| `getByRole` | `page.getByRole('button', { name: /sign in/i })` | Buttons, links, headings |
| `getByLabel` | `page.getByLabel('Email')` | Form inputs with a `<label>` |
| `getByPlaceholder` | `page.getByPlaceholder(/item name/i)` | Inputs with placeholder text |
| `getByText` | `page.getByText('Smith Family')` | Unique text content |
| `data-testid` | `page.getByTestId('login-submit')` | Reserve for highly dynamic UI elements |

Avoid CSS class selectors — they break on restyling.

---

## Troubleshooting

### Tests time out waiting for elements

- Make sure the app built with `VITE_USE_MOCK_BACKEND=true`.  A Supabase-mode build will try
  to contact the real backend, hang, and time out.
- Check that `playwright.config.ts` `webServer.env` includes `VITE_USE_MOCK_BACKEND: 'true'`.

### `net::ERR_CONNECTION_REFUSED`

The preview server failed to start.  Run `npm run build && npm run preview` manually to see
if the build or server start itself fails.

### "Wishlist not found" on the public wishlist test

The seed helper writes to `localStorage` before navigation.  If you see this error, the
`addInitScript` did not fire before the page loaded.  Make sure `seedPublicWishlist` is called
**before** `page.goto(…)`.

### Existing localStorage state interfering

Each test gets an isolated browser context in Playwright (fresh `localStorage`).  If tests
are sharing state unexpectedly, confirm that `workers: 1` is set in `playwright.config.ts`
and that `page.addInitScript` is being used (not `page.evaluate` after navigation).

### Headed mode shows a flash of unauthenticated content

This is expected for the ~1 frame before the auth store reads from localStorage.  The tests
use `await expect(...).toBeVisible({ timeout: 8_000 })` which waits through this transient
state.

---

## See Also

- [Vitest unit tests](./overview.md) — unit and component-level testing guide
- [CI/CD Pipeline](../operations/ci-cd.md) — how all test suites fit into the pipeline
- [Mock Backend](../../src/config/backend.config.ts) — `isMockMode()` implementation
