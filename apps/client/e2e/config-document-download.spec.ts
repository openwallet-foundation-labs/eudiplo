import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from './support/test';
import { hasRootCredentials, resolvedE2EConfig } from './support/e2e-config';
import { loginWithClientCredentials } from './support/login';
import { createTenant } from './support/tenants';

// "Download configuration" on a detail page saves the resource as a configuration document
// ($schema and spec), the file format of the config folder, so the file imports again
// without changes. Each test gets its own tenant.

test.use({ storageState: { cookies: [], origins: [] } });

const api = resolvedE2EConfig.apiBaseUrl;

interface ConfigDocument {
  $schema: string;
  metadata?: { generation?: number };
  spec: Record<string, unknown>;
}

/** A JSON bundle with one webhook endpoint document. */
function webhookBundle(tenantId: string, document: ConfigDocument) {
  const id = String(document.spec['id']);
  return {
    manifest: {
      format: 'eudiplo.config-bundle',
      formatVersion: 2,
      sourceVersion: 'e2e',
      exportedAt: new Date(0).toISOString(),
      tenant: tenantId,
      resources: [
        {
          kind: 'WebhookEndpoint',
          id,
          $schema: document.$schema,
          path: `webhook-endpoints/${id}.json`,
          sha256: createHash('sha256').update(JSON.stringify(document)).digest('hex'),
          ownership: 'unmanaged',
          generation: document.metadata?.generation ?? 1,
        },
      ],
      assets: [],
      requirements: [],
      warnings: [],
    },
    documents: [document],
    assets: [],
  };
}

test.beforeEach(() => {
  test.skip(
    !hasRootCredentials,
    'Set AUTH_CLIENT_ID and AUTH_CLIENT_SECRET of the backend to create a tenant.'
  );
});

test('downloads a webhook endpoint as a document that imports unchanged', async ({ page }) => {
  const tenant = await createTenant('document-download-e2e', 'Document Download E2E', [
    'tenant:admin',
    'issuance:manage',
  ]);
  const headers = { Authorization: `Bearer ${tenant.token}`, 'Content-Type': 'application/json' };
  const created = await fetch(`${api}/api/issuer/webhook-endpoints`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'notification',
      name: 'Notification Webhook',
      url: 'https://hooks.example.com/consume',
      auth: { type: 'none' },
    }),
  });
  expect(created.status, await created.text()).toBe(201);

  await loginWithClientCredentials(page, tenant.clientId, tenant.clientSecret);
  await page.goto('/webhook-endpoints/notification');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download configuration' }).click();
  const download = await downloading;

  expect(download.suggestedFilename()).toBe('notification.json');
  const document = JSON.parse(await readFile(await download.path(), 'utf8')) as ConfigDocument;
  expect(document.$schema).toMatch(
    /^https:\/\/eudiplo\.dev\/schemas\/v\d+\/WebhookEndpointConfigFile\.schema\.json$/
  );
  expect(document.spec).toMatchObject({
    id: 'notification',
    name: 'Notification Webhook',
    url: 'https://hooks.example.com/consume',
  });
  await expect(page.getByText('Configuration downloaded')).toBeVisible();

  // The import screen takes the downloaded file as it is.
  await page.goto('/settings/config-portability');
  await page.locator('#bundleInput').setInputFiles(await download.path());
  await page.getByRole('button', { name: 'Plan and validate' }).click();
  await expect(page.getByText('Ready to apply')).toBeVisible();
  await expect(page.locator('mat-chip').filter({ hasText: 'unchanged' })).toHaveCount(1);

  const plan = await fetch(`${api}/api/config-bundles/plan?mode=upsert`, {
    method: 'POST',
    headers,
    body: JSON.stringify(webhookBundle(tenant.id, document)),
  });
  expect(plan.status).toBe(201);
  expect((await plan.json()).items.map((item: { action: string }) => item.action)).toEqual([
    'unchanged',
  ]);
});
