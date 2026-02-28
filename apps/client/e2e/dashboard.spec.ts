import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('displays the dashboard after login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('shows the toolbar with eudiplo branding', async ({ page }) => {
    await page.goto('/dashboard');

    // Toolbar should contain the eudiplo name
    const toolbar = page.locator('mat-toolbar');
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toContainText('eudiplo');
  });

  test('shows the side navigation', async ({ page }) => {
    await page.goto('/dashboard');

    // Sidenav should have key navigation items
    const sidenav = page.locator('mat-sidenav');
    await expect(sidenav.getByText('Dashboard', { exact: true })).toBeVisible();
  });
});
