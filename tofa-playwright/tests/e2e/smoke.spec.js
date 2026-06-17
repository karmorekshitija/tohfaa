// @ts-check
const { test, expect } = require('@playwright/test');
const {
  trackPageErrors,
  assertDesignSystemFonts,
  assertNoHorizontalScroll,
} = require('./helpers');

// Add/remove routes to match your actual TOFA pages.
const PUBLIC_ROUTES = ['/', '/products', '/login', '/signup'];

for (const route of PUBLIC_ROUTES) {
  test(`smoke: ${route} loads cleanly + respects guardrails`, async ({ page }) => {
    const errors = trackPageErrors(page);

    const res = await page.goto(route, { waitUntil: 'networkidle' });
    expect(res?.status(), `Bad status for ${route}`).toBeLessThan(400);

    // No broken images.
    const broken = await page.evaluate(() =>
      [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).length
    );
    expect(broken, `${broken} broken image(s) on ${route}`).toBe(0);

    await assertDesignSystemFonts(page);
    await assertNoHorizontalScroll(page); // runs across desktop/tablet/mobile projects

    expect(errors, `Errors on ${route}:\n${errors.join('\n')}`).toHaveLength(0);
  });
}
