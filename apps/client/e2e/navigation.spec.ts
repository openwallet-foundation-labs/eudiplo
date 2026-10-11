import { test, expect } from './support/test';
import { hasAuthCredentials } from './support/e2e-config';

test('a collapsed navigation section stays collapsed until the user needs it', async ({ page }) => {
  test.skip(
    !hasAuthCredentials,
    'Set E2E_TENANT_CLIENT_ID and E2E_TENANT_CLIENT_SECRET for tenant flow tests.'
  );
  await page.goto('/dashboard');
  const header = page.getByRole('button', { name: 'Credential Issuance' });
  const entry = page.getByText('Credential Types', { exact: true });
  await expect(entry).toBeVisible();

  await header.click();
  await expect(header).toHaveAttribute('aria-expanded', 'false');
  await expect(entry).toBeHidden();

  await page.reload();
  await expect(header).toHaveAttribute('aria-expanded', 'false');
  await expect(entry).toBeHidden();

  // A page of the section shows it, and it stays open when the user moves on, so the
  // entries below do not move; the saved choice applies again after a reload.
  await page.goto('/credential-config');
  await expect(entry).toBeVisible();
  await page.getByText('Dashboard', { exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(entry).toBeVisible();
  await page.reload();
  await expect(entry).toBeHidden();

  await header.focus();
  await page.keyboard.press('Enter');
  await expect(header).toHaveAttribute('aria-expanded', 'true');
  await expect(entry).toBeVisible();
});
