import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for the Eudiplo client.
 *
 * Environment variables:
 *   PLAYWRIGHT_TEST_BASE_URL  - URL where the client is served (default: http://localhost:4200)
 *   E2E_API_URL               - Backend API URL used during login (default: http://localhost:3000)
 *   E2E_CLIENT_ID             - OAuth2 client-id for login (default: root)
 *   E2E_CLIENT_SECRET         - OAuth2 client-secret for login (default: root)
 *   CI                        - Set automatically in GitHub Actions
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,

  reporter: process.env['CI']
    ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'e2e-results.xml' }]]
    : 'html',

  /* Default timeout per test — may be increased for slow CI runners */
  timeout: process.env['CI'] ? 60_000 : 30_000,

  use: {
    baseURL: process.env['PLAYWRIGHT_TEST_BASE_URL'] ?? 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    /* Shared auth setup — logs in once and saves storage state */
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  /* Local dev: start Angular dev server automatically if not in CI
   * (CI uses Docker Compose to serve the client) */
  ...(!process.env['CI'] && {
    webServer: {
      command: 'npx ng serve',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  }),
});
