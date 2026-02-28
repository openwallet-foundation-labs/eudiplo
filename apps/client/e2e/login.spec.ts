import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // unauthenticated

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows login form with expected fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input[formcontrolname="apiUrl"]')).toBeVisible();
    await expect(page.locator('input[formcontrolname="clientId"]')).toBeVisible();
    await expect(page.locator('input[formcontrolname="clientSecret"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid credentials
    await page.locator('input[formcontrolname="apiUrl"]').fill('http://localhost:3000');
    await page.locator('input[formcontrolname="clientId"]').fill('invalid');
    await page.locator('input[formcontrolname="clientSecret"]').fill('invalid');

    await page.getByRole('button', { name: /login|sign in/i }).click();

    // Should show an error snackbar and stay on login page
    await expect(page.locator('mat-snack-bar-container')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });
});
