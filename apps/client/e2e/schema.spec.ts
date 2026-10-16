import { test, expect } from './support/test';
import { hasAuthCredentials, resolvedE2EConfig } from './support/e2e-config';
import { loginWithClientCredentials } from './support/login';

// Signs in as a client created for the test, not with the stored session.
test.use({ storageState: { cookies: [], origins: [] } });

const { apiBaseUrl } = resolvedE2EConfig;

/** A client-credentials access token. */
async function accessToken(clientId: string, clientSecret: string): Promise<string> {
  const discovery = (await (
    await fetch(`${apiBaseUrl}/.well-known/oauth-authorization-server`)
  ).json()) as { token_endpoint: string };
  const response = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  expect(response.ok, await response.clone().text()).toBe(true);
  return ((await response.json()) as { access_token: string }).access_token;
}

/** Calls the management API as the suite's tenant client. */
async function asTenantClient(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken(resolvedE2EConfig.clientId!, resolvedE2EConfig.clientSecret!);
  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
}

const registrarClient = {
  clientId: `e2e-registrar-${Date.now()}`,
  secret: 'e2e-registrar-secret',
};
let registrarClientCreated = false;

test.afterAll(async () => {
  if (registrarClientCreated) {
    const deleted = await asTenantClient(`/api/client/${registrarClient.clientId}`, {
      method: 'DELETE',
    });
    expect(deleted.ok, await deleted.clone().text()).toBe(true);
  }
});

test('schema pages without a registrar and without issuance:manage', async ({ page }) => {
  test.skip(
    !hasAuthCredentials,
    'Set E2E_TENANT_CLIENT_ID and E2E_TENANT_CLIENT_SECRET for tenant flow tests.'
  );
  const created = await asTenantClient('/api/client', {
    method: 'POST',
    body: JSON.stringify({
      ...registrarClient,
      description: 'Schema pages E2E',
      roles: ['registrar:manage'],
    }),
  });
  expect(created.ok, await created.clone().text()).toBe(true);
  registrarClientCreated = true;

  // The demo tenant has no registrar configuration; a development tenant may have one.
  const registrarConfig = await fetch(`${apiBaseUrl}/api/registrar/config`, {
    headers: {
      Authorization: `Bearer ${await accessToken(registrarClient.clientId, registrarClient.secret)}`,
    },
  });
  test.skip(registrarConfig.ok, 'The tenant has a registrar configuration.');

  await loginWithClientCredentials(page, registrarClient.clientId, registrarClient.secret);

  // The list names the reason instead of claiming that no schemas exist.
  await page.goto('/schema');
  const listError = page.getByRole('alert');
  await expect(listError).toContainText('Failed to load schemas: No registrar configuration');
  // The error card's actions sit next to the alert text, not inside it.
  const errorCard = page.locator('app-load-error');
  await expect(errorCard.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(errorCard.getByRole('link', { name: 'Registrar configuration' })).toBeVisible();
  await expect(page.getByText('No schemas published')).toHaveCount(0);

  // Create needs issuance:manage: disabled, with the role in its description.
  const create = page.getByRole('button', { name: 'Create schema' });
  await expect(create).toHaveAttribute('aria-disabled', 'true');
  await expect(create).toHaveAccessibleDescription(
    'Creating a schema needs the issuance:manage role'
  );
  // The button stays hoverable, so the tooltip shows the same text.
  await create.hover();
  await expect(
    page
      .locator('.cdk-overlay-container')
      .getByText('Creating a schema needs the issuance:manage role')
  ).toBeVisible();

  await page.goto('/schema/create');
  await expect(page.getByText('Access denied')).toBeVisible();
  await expect(page).not.toHaveURL(/\/schema\/create/);

  // The details page keeps the user on it with the reason, Retry and a way back.
  await page.goto('/schema/unknown-schema');
  const showError = page.getByRole('alert');
  await expect(showError).toContainText('Failed to load schema: No registrar configuration');
  await expect(showError.getByRole('button', { name: 'Retry' })).toBeVisible();
  await showError.getByRole('link', { name: 'Back to list' }).click();
  await expect(page).toHaveURL(/\/schema$/);
});
