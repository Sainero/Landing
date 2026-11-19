// Телефон: ничего не вылезает за ширину экрана, меню открывается и закрывается
import { expect, test } from '@playwright/test';

for (const path of ['/', '/docs', '/docs/studio', '/docs/import', '/docs/mcp']) {
  test(`${path}: нет прокрутки вбок`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('меню открывается и закрывается', async ({ page }) => {
  await page.goto('/');
  const menu = page.locator('[data-mobile-menu]');
  await page.locator('[data-menu-open]').click();
  await expect(menu).toBeVisible();
  await menu.locator('[data-menu-close]').click();
  await expect(menu).toBeHidden();
});
