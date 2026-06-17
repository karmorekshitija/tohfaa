// @ts-check
const { expect } = require('@playwright/test');

const ALLOWED_FONTS = ['Playfair Display', 'DM Sans', 'Space Mono'];
const BANNED_FONTS = ['Arial', 'system-ui', 'Times New Roman', '-apple-system'];

/** Attach console + network error collection to a page. */
function trackPageErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`http ${res.status()}: ${res.url()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** Fail if any visible text uses a banned/fallback font on the body. */
async function assertDesignSystemFonts(page) {
  const bodyFont = await page.evaluate(() =>
    getComputedStyle(document.body).fontFamily
  );
  for (const banned of BANNED_FONTS) {
    expect(bodyFont, `Body uses banned font "${banned}"`).not.toContain(banned);
  }
}

/** Fail if horizontal overflow exists (responsiveness guardrail). */
async function assertNoHorizontalScroll(page) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow, 'Page overflows horizontally (responsive break)').toBeFalsy();
}

module.exports = {
  ALLOWED_FONTS,
  BANNED_FONTS,
  trackPageErrors,
  assertDesignSystemFonts,
  assertNoHorizontalScroll,
};
