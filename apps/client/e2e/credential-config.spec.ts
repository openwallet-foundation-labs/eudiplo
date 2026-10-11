import { test, expect } from './support/test';
import { hasAuthCredentials } from './support/e2e-config';

test('create credential config', async ({ page }) => {
  test.skip(
    !hasAuthCredentials,
    'Set E2E_TENANT_CLIENT_ID and E2E_TENANT_CLIENT_SECRET for tenant flow tests.'
  );
  // The template's id (pid) usually exists already.
  const id = `e2e-pid-${Date.now()}`;
  await page.goto('/');

  await page.getByText('Credential Types').click();
  await page.getByRole('button').filter({ hasText: 'add' }).click();
  await page.getByRole('button', { name: 'Templates' }).click();
  await page
    .getByRole('menuitem', {
      name: 'PID (Personal Identity Document) German Personal Identity Document configuration',
    })
    .click();
  await page.getByRole('textbox', { name: 'Configuration ID' }).fill(id);
  // Guided setup: Basics, Claims, Appearance, Settings, Review
  for (let step = 0; step < 4; step++) {
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await page.getByRole('button', { name: 'Create Configuration' }).click();
  await expect(page).toHaveURL(/\/credential-config$/);
  await expect(page.getByText(id, { exact: true })).toBeVisible();
});

test('a failed load says why and loads again on Retry', async ({ page }) => {
  test.skip(
    !hasAuthCredentials,
    'Set E2E_TENANT_CLIENT_ID and E2E_TENANT_CLIENT_SECRET for tenant flow tests.'
  );
  let failLoading = true;
  await page.route('**/api/issuer/credentials', (route) =>
    failLoading && route.request().method() === 'GET'
      ? route.fulfill({ status: 500, json: { message: 'Internal server error' } })
      : route.fallback()
  );
  await page.goto('/credential-config');

  const alert = page
    .getByRole('alert')
    .filter({ hasText: 'Failed to load credential configurations: Internal server error' });
  await expect(alert).toBeVisible();
  await expect(page.getByText('No credential configurations yet.')).toHaveCount(0);
  await expect(page.getByRole('table')).toHaveCount(0);

  failLoading = false;
  await page.getByRole('button', { name: 'Retry' }).click();

  // The table, or the empty state on a tenant without configurations.
  await expect(
    page.getByRole('table').or(page.getByText('No credential configurations yet.'))
  ).toBeVisible();
  await expect(alert).toHaveCount(0);
  // Retry left with the error card, so keyboard focus continues from the page heading.
  await expect(
    page.getByRole('heading', { name: 'Credential Configurations', level: 2 })
  ).toBeFocused();
});
