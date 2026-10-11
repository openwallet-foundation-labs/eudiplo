import { randomBytes } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { expect, test } from './support/test';
import { hasAuthCredentials, resolvedE2EConfig } from './support/e2e-config';
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

/** Access token of the tenant client the other specs sign in with. */
async function tenantToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${resolvedE2EConfig.apiBaseUrl}/api/oauth2/token`, {
    form: {
      grant_type: 'client_credentials',
      client_id: resolvedE2EConfig.clientId!,
      client_secret: resolvedE2EConfig.clientSecret!,
    },
  });
  expect(response.ok(), 'tenant client token').toBe(true);
  return ((await response.json()) as { access_token: string }).access_token;
}

test.describe('verifier admin', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  // One worker, so beforeAll creates the client once: the backend allows one
  // config write per tenant at a time (409 CONFIG_WRITER_ACTIVE otherwise).
  test.describe.configure({ mode: 'default' });

  // A client per run, so the spec also passes against a reused dev backend.
  const clientId = `session-settings-${randomBytes(4).toString('hex')}`;
  const clientSecret = randomBytes(16).toString('hex');

  test.beforeAll(async ({ request }) => {
    test.skip(
      !hasAuthCredentials,
      'Set E2E_TENANT_CLIENT_ID and E2E_TENANT_CLIENT_SECRET for tenant flow tests.'
    );
    const response = await request.post(`${resolvedE2EConfig.apiBaseUrl}/api/client`, {
      headers: { Authorization: `Bearer ${await tenantToken(request)}` },
      data: {
        clientId,
        secret: clientSecret,
        description: 'E2E verifier admin without issuance or session roles',
        roles: ['presentation:manage'],
      },
    });
    expect(response.ok(), `create the verifier admin: ${await response.text()}`).toBe(true);
  });

  test.afterAll(async ({ request }) => {
    if (!hasAuthCredentials) return;
    const response = await request.delete(
      `${resolvedE2EConfig.apiBaseUrl}/api/client/${clientId}`,
      { headers: { Authorization: `Bearer ${await tenantToken(request)}` } }
    );
    expect(response.ok(), 'delete the verifier admin').toBe(true);
  });

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
