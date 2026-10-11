import { expect, test } from './support/test';
import { hasAuthCredentials } from './support/e2e-config';

test('dashboard counts a new session and links to it', async ({ page }) => {
  test.skip(
    !hasAuthCredentials,
    'Set E2E_TENANT_CLIENT_ID and E2E_TENANT_CLIENT_SECRET for tenant flow tests.'
  );

  await page.goto('/dashboard');
  const totalSessions = page.getByRole('link', { name: /Total Sessions/ }).locator('.stat-value');
  await expect(totalSessions).toHaveText(/^\s*\d+\s*$/);
  const before = Number(await totalSessions.textContent());

  await page.getByText('New Verification').click();
  await page.getByRole('combobox', { name: 'Presentation Configuration' }).click();
  await page.getByRole('option', { name: 'pid', exact: true }).click();
  await page.getByRole('button', { name: 'Generate Request' }).click();
  await expect(page).toHaveURL(/\/session-management\/[^/]+$/);

  await page.goto('/dashboard');
  // Other tests may add sessions at the same time, so count at least this one.
  await expect.poll(async () => Number(await totalSessions.textContent())).toBeGreaterThan(before);

  // Parallel tests can push this session out of the five shown, so open the newest one.
  const newest = page.locator('.activity-row').first();
  await expect(newest).toHaveAttribute('href', /^\/session-management\/[^/]+$/);
  const newestPath = await newest.getAttribute('href');
  await newest.click();
  await expect(page).toHaveURL(newestPath!);
});
