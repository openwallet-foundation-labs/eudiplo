import { randomBytes } from 'node:crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from './test';
import { hasAuthCredentials, resolvedE2EConfig } from './e2e-config';

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

/**
 * Sends a config write and repeats it while another spec file holds the tenant's config writer
 * lock: the backend allows one config write per tenant at a time (409 CONFIG_WRITER_ACTIVE).
 */
async function writeConfig(send: () => Promise<APIResponse>, label: string): Promise<void> {
  let response!: APIResponse;
  await expect(async () => {
    response = await send();
    expect(response.status(), `${label}: config writer busy`).not.toBe(409);
  }).toPass({ timeout: 15_000 });
  expect(response.ok(), `${label}: ${await response.text()}`).toBe(true);
}

/**
 * Creates an API client with these roles before the tests of the calling describe block and
 * deletes it after them. Skips the block without tenant credentials.
 */
export function useTenantClient(
  prefix: string,
  roles: string[],
  description: string
): { clientId: string; clientSecret: string } {
  // One worker, so beforeAll creates the client once.
  test.describe.configure({ mode: 'default' });

  // A client per run, so the spec also passes against a reused dev backend.
  const clientId = `${prefix}-${randomBytes(4).toString('hex')}`;
  const clientSecret = randomBytes(16).toString('hex');

  test.beforeAll(async ({ request }) => {
    test.skip(
      !hasAuthCredentials,
      'Set E2E_TENANT_CLIENT_ID and E2E_TENANT_CLIENT_SECRET for tenant flow tests.'
    );
    const headers = { Authorization: `Bearer ${await tenantToken(request)}` };
    await writeConfig(
      () =>
        request.post(`${resolvedE2EConfig.apiBaseUrl}/api/client`, {
          headers,
          data: { clientId, secret: clientSecret, description, roles },
        }),
      `create ${clientId}`
    );
  });

  test.afterAll(async ({ request }) => {
    if (!hasAuthCredentials) return;
    await deleteTenantClient(request, clientId);
  });

  return { clientId, clientSecret };
}

/** Deletes an API client of the tenant, as the tenant's admin. Unknown clients are fine. */
export async function deleteTenantClient(
  request: APIRequestContext,
  clientId: string
): Promise<void> {
  const headers = { Authorization: `Bearer ${await tenantToken(request)}` };
  await writeConfig(
    () => request.delete(`${resolvedE2EConfig.apiBaseUrl}/api/client/${clientId}`, { headers }),
    `delete ${clientId}`
  );
}

/** Replaces the roles of an API client of the tenant, as the tenant's admin. */
export async function setTenantClientRoles(
  request: APIRequestContext,
  clientId: string,
  roles: string[]
): Promise<void> {
  const headers = { Authorization: `Bearer ${await tenantToken(request)}` };
  await writeConfig(
    () =>
      request.patch(`${resolvedE2EConfig.apiBaseUrl}/api/client/${clientId}`, {
        headers,
        data: { roles },
      }),
    `update ${clientId}`
  );
}
