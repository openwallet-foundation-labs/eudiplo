import { expect, test } from './support/test';
import { useTenantClient } from './support/clients';
import { hasAuthCredentials } from './support/e2e-config';
import { loginWithClientCredentials } from './support/login';

test('session management list is reachable when authenticated', async ({ page }) => {
  test.skip(
    !hasAuthCredentials,
    'Set E2E_TENANT_CLIENT_ID and E2E_TENANT_CLIENT_SECRET for tenant flow tests.'
  );

  await page.goto('/session-management');
  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page).toHaveURL(/\/session-management(\/.*)?$/);
});

test.describe('verifier admin', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  const { clientId, clientSecret } = useTenantClient(
    'session-settings',
    ['presentation:manage'],
    'E2E verifier admin without issuance or session roles'
  );

  test('opens Session Settings without issuance roles', async ({ page }) => {
    await loginWithClientCredentials(page, clientId, clientSecret);

    const config = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/session-config') && response.request().method() === 'GET'
    );
    await page.locator('mat-sidenav').getByText('Session Settings', { exact: true }).click();
    await expect(page).toHaveURL(/\/session-management\/config$/);
    expect((await config).ok(), 'GET /api/session-config').toBe(true);
    await expect(page.getByText('Session Retention Settings')).toBeVisible();
  });

  test('is turned away from the session list', async ({ page }) => {
    await loginWithClientCredentials(page, clientId, clientSecret);
    const nav = page.locator('mat-sidenav');
    await expect(nav.getByText('Session Settings', { exact: true })).toBeVisible();
    await expect(nav.getByText('All Sessions')).toHaveCount(0);

    await page.goto('/session-management');
    // The guard's snackbar closes after 3 seconds, so check it first.
    await expect(page.getByText('Access denied')).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
