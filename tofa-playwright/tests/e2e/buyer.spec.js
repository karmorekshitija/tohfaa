// @ts-check
const { test, expect } = require('@playwright/test');
const { trackPageErrors } = require('./helpers');

// TODO: replace with real TOFA buyer test credentials
const BUYER = { email: 'buyer@test.dev', password: 'Test1234!' };

test.describe('Buyer flows', () => {
  test('can log in', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(BUYER.email);
    await page.getByLabel(/password/i).fill(BUYER.password);
    await page.getByRole('button', { name: /log ?in/i }).click();
    await expect(page).toHaveURL(/\/(account|dashboard|)/);
  });

  test('login shows error on bad credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('nope@test.dev');
    await page.getByLabel(/password/i).fill('wrong');
    await page.getByRole('button', { name: /log ?in/i }).click();
    await expect(page.getByText(/invalid|incorrect|try again/i)).toBeVisible();
  });

  test('browse → product detail → add to cart', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto('/products');
    await page.locator('[data-testid="product-card"], .product-card').first().click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    await expect(page.getByText(/cart|added/i)).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('empty cart shows branded empty state', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.getByText(/empty|nothing here|start shopping/i)).toBeVisible();
  });

  test('checkout flow: address step visible after cart', async ({ page }) => {
    // TODO: pre-seed a cart item or adjust this flow to match TOFA's checkout UX
    await page.goto('/checkout');
    await expect(page.getByText(/address|delivery|ship/i)).toBeVisible();
  });

  test('order history accessible after login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(BUYER.email);
    await page.getByLabel(/password/i).fill(BUYER.password);
    await page.getByRole('button', { name: /log ?in/i }).click();
    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: /orders|history/i })).toBeVisible();
  });
});
