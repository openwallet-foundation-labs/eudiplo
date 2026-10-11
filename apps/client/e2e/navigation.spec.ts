import type { Page } from '@playwright/test';
import { test, expect } from './support/test';
import { hasAuthCredentials } from './support/e2e-config';

test.skip(
  !hasAuthCredentials,
  'Set E2E_TENANT_CLIENT_ID and E2E_TENANT_CLIENT_SECRET for tenant flow tests.'
);

// Moves the focus with Tab, as a keyboard user does, until the side navigation
// link with this name has it.
async function tabToNavLink(page: Page, name: string) {
  const link = page.locator('mat-sidenav').getByRole('link', { name, exact: true });
  await expect(link).toBeAttached();
  for (let i = 0; i < 50; i++) {
    await page.keyboard.press('Tab');
    if (await link.evaluate((el) => el === document.activeElement)) {
      return link;
    }
  }
  throw new Error(`Tab never reached the "${name}" navigation link`);
}

test('a collapsed navigation section stays collapsed until the user needs it', async ({ page }) => {
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

test('opens an entry with Enter', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('mat-sidenav')).toBeVisible();

  const link = await tabToNavLink(page, 'Keys');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/keys$/);
  await expect(link).toHaveClass(/active-link/);
  await expect(link).toHaveAttribute('aria-current', 'page');
});

test('closes the overlay after an entry opens with Enter on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  const sidenav = page.locator('mat-sidenav');
  // The toggle has no accessible name, only its icon.
  const toggle = page
    .locator('mat-toolbar button')
    .filter({ has: page.locator('mat-icon', { hasText: /^menu$/ }) });
  await expect(toggle).toBeVisible();
  await expect(sidenav).toBeHidden();

  await toggle.click();
  // The overlay focuses its first link once it has opened; tabbing before that races it.
  await expect(sidenav.getByRole('link', { name: 'Dashboard', exact: true })).toBeFocused();
  await tabToNavLink(page, 'Keys');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/keys$/);
  await expect(sidenav).toBeHidden();
});
