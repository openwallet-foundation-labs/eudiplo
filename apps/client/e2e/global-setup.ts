import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

/**
 * Global setup: authenticate once and persist session storage state.
 *
 * The login page supports auto-login when clientId, clientSecret and apiUrl
 * are passed as query parameters. We leverage this so tests don't need to
 * repeat the login flow.
 */
setup('authenticate', async ({ page }) => {
  const apiUrl = process.env['E2E_API_URL'] ?? 'http://localhost:3000';
  const clientId = process.env['E2E_CLIENT_ID'] ?? 'root';
  const clientSecret = process.env['E2E_CLIENT_SECRET'] ?? 'root';

  // Navigate to the login page with credentials as query params (auto-login)
  await page.goto(
    `/login?apiUrl=${encodeURIComponent(apiUrl)}&clientId=${encodeURIComponent(clientId)}&clientSecret=${encodeURIComponent(clientSecret)}`
  );

  // Wait until we're redirected to the dashboard (successful login)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // Persist the authenticated session state
  await page.context().storageState({ path: authFile });
});
