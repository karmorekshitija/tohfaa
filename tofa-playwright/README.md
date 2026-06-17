# TOFA E2E Test Suite (Playwright)

## One-time setup
```bash
npm install
npx playwright install
```

## Run tests
```bash
npm run test:e2e          # headless, all viewports
npm run test:e2e:ui       # interactive UI mode
npm run test:e2e:report   # view last HTML report
```

## Before first run — customise these
1. **`tests/e2e/smoke.spec.js`** — update `PUBLIC_ROUTES` to match your actual TOFA routes
2. **`tests/e2e/buyer.spec.js`** — set real buyer test credentials + adjust selectors marked `TODO`
3. **`tests/e2e/seller.spec.js`** — set real seller test credentials + adjust selectors marked `TODO`

## Viewports tested automatically
| Project  | Width  |
|----------|--------|
| desktop  | 1280px |
| tablet   | 768px  |
| mobile   | 375px  |

## How it connects to the agent
The QA agent skill's Phase 2 fallback runs `npm run test:e2e`.
Phase 5 re-runs it. The agent only finishes when this suite is green
AND `.agents/qa-findings.md` has zero open items.
