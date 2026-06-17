// @ts-check
const { test, expect } = require('@playwright/test');

// TODO: replace with real TOFA seller test credentials
const SELLER = { email: 'seller@test.dev', password: 'Test1234!' };

async function loginAsSeller(page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(SELLER.email);
  await page.getByLabel(/password/i).fill(SELLER.password);
  await page.getByRole('button', { name: /log ?in/i }).click();
}

test.describe('Seller flows', () => {
  test('can reach seller dashboard', async ({ page }) => {
    await loginAsSeller(page);
    await page.goto('/seller/dashboard');
    await expect(page.getByRole('heading', { name: /dashboard|listings|products/i })).toBeVisible();
  });

  test('create listing validates required fields', async ({ page }) => {
    await loginAsSeller(page);
    await page.goto('/seller/products/new');
    await page.getByRole('button', { name: /save|publish|create/i }).click();
    await expect(page.getByText(/required|cannot be empty|invalid/i)).toBeVisible();
  });

  test('create a valid listing', async ({ page }) => {
    await loginAsSeller(page);
    await page.goto('/seller/products/new');
    await page.getByLabel(/title|name/i).fill('Test Product');
    await page.getByLabel(/price/i).fill('19.99');
    await page.getByLabel(/stock|quantity/i).fill('10');
    await page.getByLabel(/description/i).fill('A test product listing.');
    await page.getByRole('button', { name: /save|publish|create/i }).click();
    await expect(page.getByText(/success|created|published/i)).toBeVisible();
  });

  test('edit listing updates correctly', async ({ page }) => {
    await loginAsSeller(page);
    await page.goto('/seller/dashboard');
    // TODO: adjust selector to match TOFA's listing row/edit button
    await page.locator('[data-testid="edit-listing"], .edit-listing').first().click();
    await page.getByLabel(/title|name/i).fill('Updated Product Name');
    await page.getByRole('button', { name: /save|update/i }).click();
    await expect(page.getByText(/updated|saved|success/i)).toBeVisible();
  });

  test('zero stock edge case shown correctly', async ({ page }) => {
    await loginAsSeller(page);
    await page.goto('/seller/products/new');
    await page.getByLabel(/title|name/i).fill('Out of Stock Item');
    await page.getByLabel(/price/i).fill('9.99');
    await page.getByLabel(/stock|quantity/i).fill('0');
    await page.getByLabel(/description/i).fill('Zero stock test.');
    await page.getByRole('button', { name: /save|publish|create/i }).click();
    // Should succeed or show a clear out-of-stock indicator, not an error
    await expect(page.getByText(/success|out of stock|unavailable|created/i)).toBeVisible();
  });

  test('view incoming orders', async ({ page }) => {
    await loginAsSeller(page);
    await page.goto('/seller/orders');
    await expect(page.getByRole('heading', { name: /orders|incoming/i })).toBeVisible();
  });
});
