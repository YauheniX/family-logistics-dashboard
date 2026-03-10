import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration.
 *
 * All smoke tests run against a local Vite dev-server started by Playwright
 * in MOCK mode (VITE_USE_MOCK_BACKEND=true) so no real Supabase instance is
 * needed.  Tests are therefore deterministic and work in CI without any
 * secrets.
 *
 * See: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  /* Give each test up to 30 s before it times out */
  timeout: 30_000,

  /* Fail fast in CI; re-run once locally to catch flakes */
  retries: process.env.CI ? 1 : 0,

  /* Sequential to keep mock-localStorage state predictable */
  workers: 1,

  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    /* Base URL used in test helpers; the dev-server below listens here */
    baseURL: 'http://localhost:4173',

    /* Capture on first retry to keep CI artifacts small */
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /**
   * Launch a Vite preview server in mock mode before the test run.
   *
   * `vite build` then `vite preview` give a stable, deterministic binary
   * that mirrors the production bundle while still using the mock backend.
   * CI runs `npm run build` as a separate step and then executes the tests,
   * so the `command` here just starts the preview server.
   *
   * For local dev you can also point at the dev-server by setting
   * PLAYWRIGHT_BASE_URL=http://localhost:5173 and running `npm run dev` first.
   */
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_USE_MOCK_BACKEND: 'true',
    },
  },
});
