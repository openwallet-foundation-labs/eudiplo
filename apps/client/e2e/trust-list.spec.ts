import type { Page, Response } from '@playwright/test';
import { expect, test } from './support/test';
import { useTenantClient } from './support/clients';
import { resolvedE2EConfig } from './support/e2e-config';
import { loginWithClientCredentials } from './support/login';

function isTrustListRequest(response: Response): boolean {
  return response.url().endsWith('/api/trust-list') && response.request().method() === 'GET';
}

test.describe('verifier admin', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  const { clientId, clientSecret } = useTenantClient(
    'trust-lists',
    ['presentation:manage'],
    'E2E verifier admin without issuance roles'
  );

  /** Signs in and leaves the dashboard, which loads trust lists too, for a page that does not. */
  async function signInOnKeys(page: Page): Promise<void> {
    await loginWithClientCredentials(page, clientId, clientSecret);
    await page.goto('/keys');
  }

  test('opens Trust Lists from the navigation without issuance roles', async ({ page }) => {
    await signInOnKeys(page);
    const entry = page.locator('mat-sidenav').getByText('Trust Lists', { exact: true });
    await expect(entry).toHaveCount(1);

    const lists = page.waitForResponse(isTrustListRequest);
    await entry.click();
    await expect(page).toHaveURL(/\/trust-list$/);
    expect((await lists).ok(), 'GET /api/trust-list').toBe(true);
    await expect(page.getByRole('heading', { name: 'Trust lists' })).toBeVisible();
  });

  /** Opens the trust list with this id, or the first one, or skips the test when there is none. */
  async function openTrustList(page: Page, id?: string): Promise<void> {
    const lists = page.waitForResponse(isTrustListRequest);
    await page.goto('/trust-list');
    const ids = ((await (await lists).json()) as { id: string }[]).map((list) => list.id);
    const found = id ? ids.includes(id) : ids.length > 0;
    // Build mode imports the demo tenant and its trust list; a development tenant may have none.
    if (resolvedE2EConfig.useBuild) expect(found, `trust list ${id ?? 'of the tenant'}`).toBe(true);
    else test.skip(!found, 'No trust list to open.');
    await page.goto(`/trust-list/${id ?? ids[0]}`);
  }

  test('is told that credential config references need issuance:manage', async ({ page }) => {
    await signInOnKeys(page);
    await openTrustList(page);

    await expect(page.getByText('You need the issuance:manage role')).toBeVisible();
    await expect(page.getByText('No credential configs reference this trust list.')).toHaveCount(0);
  });

  test('sees which presentation configs reference the trust list', async ({ page }) => {
    await signInOnKeys(page);
    // The demo trust list; the demo presentation configs pid and age-over-18 accept its issuers.
    await openTrustList(page, '580831bc-ef11-43f4-a3be-a2b6bf1b29a3');

    const card = page
      .locator('mat-card')
      .filter({ has: page.getByText('Referenced by Presentation Configs', { exact: true }) });
    await expect(card.locator('a[href="/presentation-config/pid"]')).toBeVisible();
    await expect(card.locator('a[href="/presentation-config/age-over-18"]')).toBeVisible();
  });
});
