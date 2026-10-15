import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './support/test';
import { hasRootCredentials, resolvedE2EConfig } from './support/e2e-config';
import { loginWithClientCredentials } from './support/login';
import { createTenant, type TestTenant } from './support/tenants';

// Wallet provider trust lists in Issuer Settings: each entry is either a managed
// trust list of the tenant ({ trustListId }) or an external one ({ url, verifierX509Der }).
// The demo tenant's resources are read-only, so the spec creates its own tenant.

test.use({ storageState: { cookies: [], origins: [] } });
// The second test edits the settings the first one saved.
test.describe.configure({ mode: 'serial' });

const api = resolvedE2EConfig.apiBaseUrl;
const trustListId = 'wallet-providers';
const externalUrl = 'https://trust-list.example.com/wallet-providers';
const serverExternalUrl = 'https://trust-list.example.com/server-wallet-providers';
const certificatePem = readFileSync(
  join(__dirname, 'fixtures', 'key-chain', 'leaf-cert.pem'),
  'utf8'
);
const certificateDer = certificatePem.replaceAll(/-----[^-]+-----|\s/g, '');

let tenant: TestTenant;

test.beforeAll(async () => {
  test.skip(
    !hasRootCredentials,
    'Set AUTH_CLIENT_ID and AUTH_CLIENT_SECRET of the backend to create a tenant.'
  );
  tenant = await createTenant('wallet-trust', 'Wallet Trust Lists', ['issuance:manage']);
  const headers = { Authorization: `Bearer ${tenant.token}`, 'Content-Type': 'application/json' };
  // A trust list needs a key chain that signs it.
  const keyChain = await fetch(`${api}/api/key-chain`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      usageType: 'trustList',
      type: 'standalone',
      description: 'Wallet provider trust list signing',
    }),
  });
  expect(keyChain.status, await keyChain.clone().text()).toBe(201);
  const response = await fetch(`${api}/api/trust-list`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: trustListId,
      description: 'Accepted wallet providers',
      entities: [
        {
          type: 'external',
          providerType: 'wallet-provider',
          issuerCertPem: certificatePem,
          revocationCertPem: certificatePem,
          info: { name: 'Example Wallet Provider' },
        },
      ],
    }),
  });
  expect(response.status, await response.clone().text()).toBe(201);
});

async function selectOption(page: Page, field: Locator, option: string | RegExp) {
  await field.click();
  await page.getByRole('option', { name: option }).click();
}

/** The expansion panel of the built-in authorization server on the Wallet access tab. */
function builtInServer(page: Page): Locator {
  return page
    .locator('mat-expansion-panel')
    .filter({ has: page.getByText('Built-in Authorization Server', { exact: true }) });
}

/** Opens the built-in server's panel and turns its shared wallet provider trust lists off. */
async function useOwnTrustLists(page: Page): Promise<Locator> {
  const server = builtInServer(page);
  const header = server.locator('mat-expansion-panel-header');
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  const inherit = server.getByRole('switch', { name: 'Use shared wallet provider trust lists' });
  if ((await inherit.getAttribute('aria-checked')) === 'true') await inherit.click();
  await expect(inherit).not.toBeChecked();
  return server;
}

/** Adds a managed entry for the spec's trust list and an external entry with `url`. */
async function addBothEntries(page: Page, scope: Locator, url: string) {
  await scope.getByRole('button', { name: 'Add managed trust list' }).click();
  await selectOption(
    page,
    scope.getByRole('combobox', { name: 'Managed trust list 1' }),
    new RegExp(`\\(${trustListId}\\)`)
  );
  await scope.getByRole('button', { name: 'Add external trust list' }).click();
  await scope.getByRole('textbox', { name: 'Trust list URL 2' }).fill(url);
  await scope.getByRole('textbox', { name: 'Trust list signer certificate' }).fill(certificatePem);
}

/** Asserts entry 1 is managed with the spec's list and entry 2 external with `url`. */
async function expectBothEntries(scope: Locator, url: string) {
  await expect(scope.getByRole('combobox', { name: 'Managed trust list 1' })).toHaveText(
    new RegExp(`\\(${trustListId}\\)`)
  );
  await expect(scope.getByRole('textbox', { name: 'Trust list URL 1' })).toHaveCount(0);
  await expect(scope.getByRole('combobox', { name: 'Managed trust list 2' })).toHaveCount(0);
  await expect(scope.getByRole('textbox', { name: 'Trust list URL 2' })).toHaveValue(url);
  await expect(scope.getByRole('textbox', { name: 'Trust list signer certificate' })).toHaveValue(
    certificateDer
  );
}

/** The Wallet Provider Trust and Defaults section on the Trust tab, opened. */
async function sharedTrustLists(page: Page): Promise<Locator> {
  const section = page
    .locator('mat-expansion-panel')
    .filter({ has: page.getByText('Wallet Provider Trust and Defaults', { exact: true }) });
  const header = section.locator('mat-expansion-panel-header');
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  return section;
}

/** The tenant's stored issuer settings. */
async function savedConfig() {
  const response = await fetch(`${api}/api/issuer/config`, {
    headers: { Authorization: `Bearer ${tenant.token}` },
  });
  expect(response.ok).toBe(true);
  return response.json();
}

/** The built-in authorization server of stored issuer settings. */
function storedBuiltInServer(config: { authorizationServers: { type: string }[] }): any {
  return config.authorizationServers.find((entry) => entry.type === 'built-in');
}

test('keeps managed and external wallet provider trust lists after a reload', async ({ page }) => {
  await loginWithClientCredentials(page, tenant.clientId, tenant.clientSecret);
  await page.goto('/issuance-config/edit');

  // The new tenant has no identity yet, so the guided setup opens.
  await expect(page.getByText('Step 1 of 4 · Identity')).toBeVisible();
  await page.getByRole('textbox', { name: 'Name' }).fill('Wallet Trust Lists');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('· Wallet access')).toBeVisible();

  const server = await useOwnTrustLists(page);
  await addBothEntries(page, server, serverExternalUrl);

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('· Trust')).toBeVisible();
  await addBothEntries(page, await sharedTrustLists(page), externalUrl);

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('· Review')).toBeVisible();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page).toHaveURL(/\/issuance-config$/);

  // The API stores each entry in its mode.
  const config = await savedConfig();
  expect(config.walletProviderTrustLists).toEqual([
    { trustListId },
    { url: externalUrl, verifierX509Der: certificateDer },
  ]);
  expect(storedBuiltInServer(config).walletProviderTrustLists).toEqual([
    { trustListId },
    { url: serverExternalUrl, verifierX509Der: certificateDer },
  ]);

  await page.goto('/issuance-config/edit');
  await page.getByRole('tab', { name: 'Wallet access' }).click();
  await expectBothEntries(await useOwnTrustLists(page), serverExternalUrl);

  await page.getByRole('tab', { name: 'Trust' }).click();
  await expectBothEntries(await sharedTrustLists(page), externalUrl);
});

test('shows a retryable alert when the trust lists do not load', async ({ page }) => {
  let failing = true;
  await page.route(
    (url) => url.pathname === '/api/trust-list',
    (route) =>
      failing && route.request().method() === 'GET'
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ statusCode: 500, message: 'Trust lists unavailable' }),
          })
        : route.fallback()
  );

  await loginWithClientCredentials(page, tenant.clientId, tenant.clientSecret);
  await page.goto('/issuance-config/edit');
  await page.getByRole('tab', { name: 'Wallet access' }).click();
  let server = await useOwnTrustLists(page);

  // The stored entry stays visible with a note while the lists are missing.
  await expect(server.getByRole('combobox', { name: 'Managed trust list 1' })).toHaveText(
    `${trustListId} (lists not loaded)`
  );
  let alert = server.getByRole('alert');
  await expect(alert).toContainText('Trust lists unavailable.');
  await expect(alert).toContainText(
    'Selected lists are kept; retry or add an external trust list.'
  );

  // Saving while the lists are missing keeps the stored reference.
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page).toHaveURL(/\/issuance-config$/);
  expect(storedBuiltInServer(await savedConfig()).walletProviderTrustLists).toEqual([
    { trustListId },
    { url: serverExternalUrl, verifierX509Der: certificateDer },
  ]);

  await page.goto('/issuance-config/edit');
  await page.getByRole('tab', { name: 'Wallet access' }).click();
  server = await useOwnTrustLists(page);
  alert = server.getByRole('alert');
  await expect(alert).toBeVisible();

  failing = false;
  await alert.getByRole('button', { name: 'Retry' }).click();
  await expect(server.getByRole('alert')).toHaveCount(0);
  await expect(server.getByRole('combobox', { name: 'Managed trust list 1' })).toHaveText(
    new RegExp(`\\(${trustListId}\\)`)
  );
});
