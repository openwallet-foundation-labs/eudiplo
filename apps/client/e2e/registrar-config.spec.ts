import { randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Page } from '@playwright/test';
import { expect, test } from './support/test';
import { hasRootCredentials, resolvedE2EConfig } from './support/e2e-config';
import { loginWithClientCredentials } from './support/login';

// The Registrar Config screen against the real backend. The backend checks the
// registrar credentials at the token endpoint of the OIDC realm before it
// saves them, so a stub realm runs in the test process. The registrar itself
// is not called. Each test gets its own tenant with the registrar:manage role.

test.use({ storageState: { cookies: [], origins: [] } });

const api = resolvedE2EConfig.apiBaseUrl;
const registrarUrl = 'https://registrar.example.com/api';
const username = 'registrar-user';
const password = 'registrar-password';

let realms: Server;
let realmsOrigin: string;

/** URL of a stub OIDC realm; every realm accepts the same account. */
function realmUrl(name: string): string {
  return `${realmsOrigin}/realms/${name}`;
}

/** Answers the discovery and password-grant requests the backend sends to an OIDC realm. */
function stubRealms(request: IncomingMessage, response: ServerResponse): void {
  const send = (status: number, body: unknown) => {
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(body));
  };
  const path = new URL(request.url ?? '/', 'http://realm').pathname;
  const [, realm, endpoint] = /^\/realms\/([\w-]+)\/(.+)$/.exec(path) ?? [];
  if (request.method === 'GET' && endpoint === '.well-known/openid-configuration') {
    send(200, {
      issuer: realmUrl(realm),
      token_endpoint: `${realmUrl(realm)}/protocol/openid-connect/token`,
    });
    return;
  }
  if (request.method === 'POST' && endpoint === 'protocol/openid-connect/token') {
    let body = '';
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => {
      const form = new URLSearchParams(body);
      const valid =
        form.get('grant_type') === 'password' &&
        form.get('username') === username &&
        form.get('password') === password;
      if (valid) {
        send(200, { access_token: 'stub-token', token_type: 'Bearer', expires_in: 300 });
      } else {
        send(401, { error: 'invalid_grant' });
      }
    });
    return;
  }
  send(404, { error: 'not_found' });
}

test.beforeAll(async () => {
  realms = createServer(stubRealms);
  await new Promise<void>((resolve) => realms.listen(0, '127.0.0.1', resolve));
  realmsOrigin = `http://127.0.0.1:${(realms.address() as AddressInfo).port}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => realms.close(() => resolve()));
});

async function accessToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(`${api}/api/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  expect(response.ok).toBe(true);
  return (await response.json()).access_token;
}

interface Tenant {
  clientId: string;
  clientSecret: string;
  /** Sends a request to the backend API as the tenant's admin client. */
  call(method: string, path: string, body?: unknown): Promise<Response>;
}

/** A new tenant whose admin client may manage the registrar configuration. */
async function createTenant(): Promise<Tenant> {
  const root = await accessToken(
    resolvedE2EConfig.rootClientId!,
    resolvedE2EConfig.rootClientSecret!
  );
  const response = await fetch(`${api}/api/tenant`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${root}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: `registrar-e2e-${randomBytes(4).toString('hex')}`,
      name: 'Registrar E2E',
      roles: ['registrar:manage'],
    }),
  });
  expect(response.status).toBe(201);
  const { clientId, clientSecret } = (await response.json()).client;
  const token = await accessToken(clientId, clientSecret);
  return {
    clientId,
    clientSecret,
    call: (method, path, body) =>
      fetch(`${api}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
  };
}

async function openRegistrarConfig(page: Page): Promise<void> {
  await page.locator('mat-sidenav').getByText('Registrar Config', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Registrar Configuration' })).toBeVisible();
}

function signIn(page: Page, tenant: Tenant): Promise<void> {
  return loginWithClientCredentials(page, tenant.clientId, tenant.clientSecret);
}

const storedDefaults = {
  privacy_policy: 'https://verifier.example/privacy',
  support_uri: 'mailto:support@verifier.example',
  provides_attestations: ['urn:example:pid'],
};

async function storeConfig(tenant: Tenant, extra: Record<string, unknown> = {}): Promise<void> {
  const response = await tenant.call('POST', '/api/registrar/config', {
    registrarUrl,
    oidcUrl: realmUrl('registrar'),
    clientId: 'registrar-client',
    username,
    password,
    registrationCertificateDefaults: storedDefaults,
    ...extra,
  });
  expect(response.status).toBe(201);
}

async function storedConfig(tenant: Tenant): Promise<Record<string, unknown>> {
  const response = await tenant.call('GET', '/api/registrar/config');
  expect(response.status).toBe(200);
  return response.json();
}

test.beforeEach(() => {
  test.skip(
    !hasRootCredentials,
    'Set AUTH_CLIENT_ID and AUTH_CLIENT_SECRET of the backend to create a tenant for the registrar.'
  );
});

test('creates a configuration and explains a URL without a scheme', async ({ page }) => {
  const tenant = await createTenant();
  await signIn(page, tenant);
  await openRegistrarConfig(page);

  await page.getByRole('textbox', { name: 'OIDC URL' }).fill(realmUrl('registrar'));
  await page.getByRole('textbox', { name: 'Client ID' }).fill('registrar-client');
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const registrarUrlField = page.getByRole('textbox', { name: 'Registrar URL' });
  await registrarUrlField.fill('registrar.example.com/api');
  await registrarUrlField.blur();
  await expect(
    page.getByText('Enter a full URL, for example https://registrar.example.com/api')
  ).toBeVisible();
  const save = page.getByRole('button', { name: 'Save Configuration' });
  await expect(save).toBeDisabled();

  await registrarUrlField.fill(registrarUrl);
  await expect(save).toBeEnabled();
  await save.click();

  await expect(page.getByText('Configuration saved successfully')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Update Configuration' })).toBeVisible();
  expect(await storedConfig(tenant)).toMatchObject({
    registrarUrl,
    oidcUrl: realmUrl('registrar'),
    hasPassword: true,
  });
});

test('reports credentials the OIDC realm rejects', async ({ page }) => {
  const tenant = await createTenant();
  await signIn(page, tenant);
  await openRegistrarConfig(page);

  await page.getByRole('textbox', { name: 'Registrar URL' }).fill(registrarUrl);
  await page.getByRole('textbox', { name: 'OIDC URL' }).fill(realmUrl('registrar'));
  await page.getByRole('textbox', { name: 'Client ID' }).fill('registrar-client');
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Save Configuration' }).click();

  await expect(
    page.getByText(/Invalid registrar credentials: the OIDC provider answered with HTTP 401/)
  ).toBeVisible();
  expect((await tenant.call('GET', '/api/registrar/config')).status).toBe(404);
});

test('asks for the password again after a URL change and replaces the configuration', async ({
  page,
}) => {
  const tenant = await createTenant();
  await storeConfig(tenant, { clientSecret: 'registrar-secret' });
  await signIn(page, tenant);
  await openRegistrarConfig(page);

  await page.getByRole('textbox', { name: 'OIDC URL' }).fill(realmUrl('other'));
  await expect(page.getByText('The URL changed. Enter the password again.')).toBeVisible();
  const update = page.getByRole('button', { name: 'Update Configuration' });
  await expect(update).toBeDisabled();

  await page.getByLabel('Password', { exact: true }).fill(password);
  await update.click();

  await expect(page.getByText('Configuration saved successfully')).toBeVisible();
  expect(await storedConfig(tenant)).toMatchObject({
    oidcUrl: realmUrl('other'),
    hasPassword: true,
    hasClientSecret: false,
    registrationCertificateDefaults: storedDefaults,
  });
});

test('keeps registration certificate defaults the form does not show', async ({ page }) => {
  const tenant = await createTenant();
  await storeConfig(tenant);
  await signIn(page, tenant);
  await openRegistrarConfig(page);

  await expect(page.getByRole('textbox', { name: 'Support URI' })).toHaveValue(
    storedDefaults.support_uri
  );
  await page.getByRole('textbox', { name: 'Support URI' }).fill('https://verifier.example/help');
  await page.getByRole('button', { name: 'Update Configuration' }).click();
  await expect(page.getByText('Configuration saved successfully')).toBeVisible();

  const stored = await (await tenant.call('GET', '/api/registrar/config')).json();
  expect(stored.registrationCertificateDefaults).toEqual({
    ...storedDefaults,
    support_uri: 'https://verifier.example/help',
  });
});

test('shows an error with Retry instead of an empty form when loading fails', async ({ page }) => {
  const tenant = await createTenant();
  await storeConfig(tenant);
  // The dashboard loads the configuration too, so every load fails until Retry.
  let failLoading = true;
  await page.route('**/api/registrar/config', (route) =>
    failLoading
      ? route.fulfill({ status: 500, json: { message: 'Internal server error' } })
      : route.fallback()
  );
  await signIn(page, tenant);
  await openRegistrarConfig(page);

  await expect(
    page.getByRole('alert').filter({ hasText: 'The registrar configuration could not be loaded' })
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Registrar URL' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Save Configuration/ })).toHaveCount(0);

  failLoading = false;
  await page.getByRole('button', { name: 'Retry' }).click();

  await expect(page.getByRole('textbox', { name: 'Registrar URL' })).toHaveValue(registrarUrl);
  await expect(page.getByRole('button', { name: 'Update Configuration' })).toBeVisible();
});

test('deletes the configuration', async ({ page }) => {
  const tenant = await createTenant();
  await storeConfig(tenant);
  await signIn(page, tenant);
  await openRegistrarConfig(page);

  let question = '';
  page.once('dialog', (dialog) => {
    question = dialog.message();
    return dialog.accept();
  });
  await page.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(page.getByText('Configuration deleted')).toBeVisible();
  expect(question).toContain(
    'Its URLs, account, stored password and registration certificate defaults are removed.'
  );
  await expect(page.getByRole('button', { name: 'Save Configuration' })).toBeVisible();
  expect((await tenant.call('GET', '/api/registrar/config')).status).toBe(404);
});
