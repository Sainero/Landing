import { defineConfig, devices } from '@playwright/test';

/**
 * Браузерные тесты на собранном сайте (yarn build + astro preview), как его увидят люди.
 * Браузер: на Windows — установленный Microsoft Edge (ничего качать не нужно), на macOS и Linux —
 * Chromium Playwright (один раз: npx playwright install chromium). Другой — LANDING_TEST_BROWSER=chrome.
 */
const PORT = Number(process.env.LANDING_TEST_PORT ?? 4329);
const channel = process.env.LANDING_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  outputDir: '.tmp/test-results',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel,
    trace: 'off',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium', channel }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    // --ignore-lock: свой сервер на своём порту, даже если открыт обычный yarn preview
    command: `yarn build && yarn preview --port ${PORT} --host 127.0.0.1 --ignore-lock`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
