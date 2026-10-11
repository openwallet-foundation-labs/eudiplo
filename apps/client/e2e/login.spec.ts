import type { Page } from '@playwright/test';
import { expect, test } from './support/test';
import { hasAuthCredentials, resolvedE2EConfig } from './support/e2e-config';
import { loginWithClientCredentials } from './support/login';

test.use({ storageState: { cookies: [], origins: [] } });

test('login page is accessible', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('login with client credentials redirects to dashboard', async ({ page }) => {
  test.skip(
    !hasAuthCredentials,
    'Set E2E_TENANT_CLIENT_ID and E2E_TENANT_CLIENT_SECRET to run tenant login flow test.'
  );

  await loginWithClientCredentials(
    page,
    resolvedE2EConfig.clientId!,
    resolvedE2EConfig.clientSecret!
  );
});

test.describe('kept session', () => {
  test.skip(
    !hasAuthCredentials,
    'Set E2E_TENANT_CLIENT_ID and E2E_TENANT_CLIENT_SECRET to run the kept session tests.'
  );

  /** Signs in, then lets the stored token expire, as after a long break. */
  async function signInAndExpire(page: Page): Promise<void> {
    await loginWithClientCredentials(
      page,
      resolvedE2EConfig.clientId!,
      resolvedE2EConfig.clientSecret!
    );
    await page.evaluate(() => localStorage.setItem('token_expiration', String(Date.now() - 1000)));
  }

  test('resumes on the page the user was on once the backend answers again', async ({ page }) => {
    await signInAndExpire(page);
    let backendDown = true;
    await page.route('**/api/oauth2/token', (route) =>
      backendDown ? route.abort('connectionrefused') : route.fallback()
    );

    await page.goto('/settings/connection');

    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fsettings%2Fconnection$/);
    await expect(page.getByRole('status')).toContainText(
      `Resuming the session of ${resolvedE2EConfig.clientId}`
    );

    backendDown = false;
    // Only the button sends a token request this soon; the automatic retry comes later.
    const renewal = page.waitForRequest('**/api/oauth2/token', { timeout: 1_000 });
    await page.getByRole('button', { name: 'Try again now' }).click();
    await renewal;
    await expect(page).toHaveURL(/\/settings\/connection$/);
  });

  test('signs out of the kept session and opens the dashboard after signing in again', async ({
    page,
  }) => {
    await signInAndExpire(page);
    let backendDown = true;
    await page.route('**/api/oauth2/token', (route) =>
      backendDown ? route.abort('connectionrefused') : route.fallback()
    );
    await page.goto('/settings/connection');
    await expect(page.getByRole('status')).toContainText('Resuming the session of');

    await page.getByRole('button', { name: 'Sign out and use other credentials' }).click();
    await expect(page.getByLabel('EUDIPLO Instance')).toHaveValue(resolvedE2EConfig.apiBaseUrl);

    backendDown = false;
    await page.getByRole('tab', { name: 'Client ID and Secret' }).click();
    await expect(page.getByRole('textbox', { name: 'Client ID' })).toHaveValue(
      resolvedE2EConfig.clientId!
    );
    await page
      .getByRole('textbox', { name: 'Client Secret' })
      .fill(resolvedE2EConfig.clientSecret!);
    await page.getByRole('button', { name: 'Login with Client Credentials' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('shows the form and names the client when the stored credentials are rejected', async ({
    page,
  }) => {
    await signInAndExpire(page);
    // Hold the answer until the page waits for the kept session, then reject the credentials.
    let reject!: () => void;
    const rejected = new Promise<void>((resolve) => (reject = resolve));
    await page.route('**/api/oauth2/token', async (route) => {
      await rejected;
      await route.fulfill({
        status: 401,
        json: { statusCode: 401, message: 'Invalid client credentials', error: 'Unauthorized' },
      });
    });

    await page.goto('/settings/connection');
    await expect(page.getByRole('status')).toContainText('Resuming the session of');
    reject();

    await expect(
      page.getByText(`The credentials of ${resolvedE2EConfig.clientId} were rejected`)
    ).toBeVisible();
    await expect(page.getByLabel('EUDIPLO Instance')).toBeFocused();
    await expect(page.getByRole('button', { name: 'Try again now' })).toHaveCount(0);
  });
});
