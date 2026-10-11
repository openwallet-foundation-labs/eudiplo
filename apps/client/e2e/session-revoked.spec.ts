import { expect, test } from './support/test';
import { deleteTenantClient, setTenantClientRoles, useTenantClient } from './support/clients';
import { loginWithClientCredentials } from './support/login';

// The backend checks the API client behind a token on every request. The Web Client follows it:
// a deleted client ends the session, and a lost role hides its pages and is named.

test.describe('deleted client', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  const { clientId, clientSecret } = useTenantClient(
    'revoked-session',
    ['presentation:manage'],
    'E2E client that is deleted while signed in'
  );

  test('ends the session with a notice', async ({ page, request }) => {
    await loginWithClientCredentials(page, clientId, clientSecret);

    await deleteTenantClient(request, clientId);
    await page.locator('mat-sidenav').getByText('Session Settings', { exact: true }).click();

    const notice = page.getByText('Your API client no longer has access');
    await expect(notice).toBeVisible();
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('client with changed roles', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  const { clientId, clientSecret } = useTenantClient(
    'changed-roles',
    ['presentation:manage', 'issuance:manage'],
    'E2E client whose roles change while signed in'
  );

  test('names a removed role, hides its menu entries and offers to leave its page', async ({
    page,
    request,
  }) => {
    await loginWithClientCredentials(page, clientId, clientSecret);
    const nav = page.locator('mat-sidenav');
    await expect(nav.getByText('Credential Types', { exact: true })).toBeVisible();
    // The dashboard's own requests must not be the first ones refused.
    await page.waitForLoadState('networkidle');

    await setTenantClientRoles(request, clientId, ['presentation:manage']);
    const refused = page.waitForResponse(
      (response) => response.url().includes('/api/issuer/credentials') && response.status() === 403
    );
    await nav.getByText('Credential Types', { exact: true }).click();
    await refused;

    await expect(
      page.getByText(
        'Your API client no longer has the role issuance:manage, which this page needs.'
      )
    ).toBeVisible();
    await expect(nav.getByText('Credential Types', { exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(/\/credential-config$/);
    await page.getByRole('button', { name: 'Leave page' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(nav.getByText('Session Settings', { exact: true })).toBeVisible();
  });
});
