import type { Page, Response } from '@playwright/test';
import { expect, test } from './support/test';
import { useTenantClient } from './support/clients';
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
});
