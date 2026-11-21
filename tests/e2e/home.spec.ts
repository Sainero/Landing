// Главная: живые презентации запускаются по щелчку и листаются вместе с сайтом
import { expect, test } from '@playwright/test';
import { deckCounter, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('при загрузке нет ни одного фрейма с презентацией', async ({ page }) => {
  const done = watchErrors(page);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('h1')).toHaveText(/Презентации,\s*которые\s*живут/);
  done();
});

test('вкладки листают кадры витрины', async ({ page }) => {
  const showcase = page.locator('[data-showcase]');
  await showcase.locator('[data-slide-tab="3"]').click();
  await expect(showcase.locator('[data-slide-tab="3"]')).toHaveAttribute('aria-selected', 'true');
  await expect(showcase.locator('[data-poster] img[data-look="light"]')).toHaveAttribute('src', /light-4\.webp$/);
  await expect(showcase.locator('[data-poster-count]')).toHaveText('4 из 14');
});

test('кадр витрины виден: сразу и после смены вкладки под курсором', async ({ page }) => {
  const showcase = page.locator('[data-showcase]');
  const poster = showcase.locator('[data-poster] img:visible');
  const opacity = () => poster.evaluate((img) => Number(getComputedStyle(img).opacity));
  await expect(poster).toHaveJSProperty('complete', true);
  await expect.poll(opacity).toBe(1);
  // щелчок по вкладке — курсор остаётся на витрине, автопрокрутка ждёт, а кадр всё равно появляется
  await showcase.locator('[data-slide-tab="2"]').click();
  await expect(poster).toHaveAttribute('src', /-3\.webp$/);
  await expect.poll(opacity).toBe(1);
});

test('на первом экране нет кода: ни YAML, ни имён файлов данных', async ({ page }) => {
  const hero = page.locator('[data-hero]');
  await expect(hero.locator('pre, code')).toHaveCount(0);
  await expect(hero).not.toContainText(/deck\.yaml|YAML|template:/);
});

test('«Запустить показ» открывает витрину на том же слайде, дальше всё синхронно', async ({ page }) => {
  const done = watchErrors(page);
  const showcase = page.locator('[data-showcase]');
  await showcase.locator('[data-slide-tab="3"]').click();
  await showcase.locator('[data-live-start]').click();
  const counter = deckCounter(page, '[data-showcase] iframe');
  await expect(counter).toHaveText('4 из 14');
  await expect(showcase.locator('[data-poster]')).toHaveCount(0);

  // вкладка → слайд показа
  await showcase.locator('[data-slide-tab="6"]').click();
  await expect(counter).toHaveText('7 из 14');

  // листание внутри показа → вкладка. Стрелка — прямо в документ показа: тест о том, что сайт идёт за показом,
  // а не о мыши и фокусе (щелчок по «Далее» внутри фрейма при параллельном прогоне иногда теряется).
  // Пока показ доигрывает переход, он может пропустить нажатие — тогда ещё раз, но только пока он на седьмом слайде
  const show = page.frame({ url: /\/demo\/slideria\.html/ })!;
  await expect(async () => {
    if ((await counter.textContent()) === '7 из 14') {
      await show.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', bubbles: true })));
    }
    await expect(counter).toHaveText('8 из 14', { timeout: 1500 });
  }).toPass({ timeout: 10_000 });
  await expect(showcase.locator('[data-slide-tab="7"]')).toHaveAttribute('aria-selected', 'true');
  done();
});

test('тема сайта передаётся в запущенную презентацию', async ({ page }) => {
  await page.locator('[data-showcase] [data-live-start]').click();
  await expect(deckCounter(page, '[data-showcase] iframe')).toHaveText('1 из 14');
  const before = await page.locator('html').getAttribute('data-theme');
  const after = before === 'dark' ? 'light' : 'dark';
  await page.locator('header [data-theme-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', after);
  await expect(page.frameLocator('[data-showcase] iframe').locator('html')).toHaveAttribute('data-theme', after);
});

test('окно докладчика запускается по щелчку и идёт за витриной', async ({ page }) => {
  await page.locator('[data-showcase] [data-live-start]').click();
  await expect(deckCounter(page, '[data-showcase] iframe')).toHaveText('1 из 14');
  await page.locator('[data-showcase] [data-slide-tab="4"]').click();
  await expect(deckCounter(page, '[data-showcase] iframe')).toHaveText('5 из 14');

  await page.locator('[data-presenter-live]').click();
  await expect(page.frameLocator('[data-presenter-preview] iframe').locator('#ct')).toHaveText('5 / 14', { timeout: 15_000 });
});

test('блоки: девять слайдов галереи в разных темах, картинки в теме сайта', async ({ page }) => {
  const blocks = page.locator('[data-blocks] [data-block]');
  await expect(blocks).toHaveCount(9);
  const loaded = () => blocks.locator('img:visible').evaluateAll((imgs) => (imgs as HTMLImageElement[]).map((i) => i.complete && i.naturalWidth > 0));
  for (const b of await blocks.all()) await b.scrollIntoViewIfNeeded();
  await expect.poll(loaded).toEqual(Array(9).fill(true));
  // слайды галереи, не витрины; видимы светлые, после смены темы — тёмные
  const src = () => blocks.locator('img:visible').evaluateAll((imgs) => (imgs as HTMLImageElement[]).map((i) => i.currentSrc));
  expect((await src()).every((u) => /(sand|mint|editorial|graphite)-\d-light/.test(u))).toBe(true);
  await page.locator('header [data-theme-toggle]').click();
  await expect.poll(async () => (await src()).every((u) => /-dark/.test(u))).toBe(true);
});

test('блоки: слайд открывается крупно, стрелки листают, Esc закрывает', async ({ page }) => {
  const done = watchErrors(page);
  const dialog = page.locator('[data-zoom-dialog]');
  await page.locator('[data-zoom]').nth(1).scrollIntoViewIfNeeded();
  await page.locator('[data-zoom]').nth(1).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-zoom-name]')).toHaveText('Тест для зала');
  const big = dialog.locator('img:visible');
  await expect.poll(() => big.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth >= 1200)).toBe(true);
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('[data-zoom-name]')).toHaveText('Матрица решений');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  done();
});

test('три способа: у карточек одно устройство и ни слова о 187 фигурах', async ({ page }) => {
  const ways = page.locator('#how [data-way]');
  await expect(ways).toHaveCount(3);
  for (const w of await ways.all()) {
    await expect(w.locator('h3')).toHaveCount(1);
    await expect(w.locator('li')).toHaveCount(3);
  }
  // фигур в студии меньше, 187 — это то, что понимает импорт: на главной числа нет
  await expect(page.locator('main')).not.toContainText('187');
  // карточки в ряд одной высоты
  const heights = await ways.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  expect(new Set(heights).size).toBe(1);
});

// ---------- полёт сквозь слайды (SlideWarp) ----------
const warp = (page: import('@playwright/test').Page) => page.locator('[data-hero] [data-warp]');
/** Темы кадров на видимых карточках: «light», «dark» */
const paintedLooks = (page: import('@playwright/test').Page) => warp(page).locator('canvas').evaluateAll((cs) => [
  ...new Set((cs as HTMLCanvasElement[]).filter((c) => c.getClientRects().length).map((c) => (c.dataset.painted ?? 'none').split(':')[0])),
]);

test('полёт слайдов: кадры нарисованы в холстах, картинок нет', async ({ page }) => {
  const done = watchErrors(page);
  await expect(warp(page)).toHaveAttribute('data-ready', '');
  await expect(warp(page).locator('img')).toHaveCount(0);
  await expect.poll(() => paintedLooks(page)).toEqual(['light']);
  // карточки летят анимацией CSS, а не скриптом
  const name = await warp(page).locator('.warp-card').first().evaluate((el) => getComputedStyle(el).animationName);
  expect(name).toContain('warp-fly');
  done();
});

test('самый крупный элемент (LCP) — не карточка полёта', async ({ page }) => {
  await expect(warp(page)).toHaveAttribute('data-ready', '');
  await page.waitForTimeout(1500);
  const lcp = await page.evaluate(() => new Promise<string>((ok) => {
    new PerformanceObserver((list) => {
      const el = (list.getEntries().at(-1) as PerformanceEntry & { element?: Element } | undefined)?.element;
      ok(!el ? 'none' : el.closest('[data-warp]') ? 'warp' : el.tagName);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  }));
  expect(lcp).not.toBe('warp');
});

test('смена темы перерисовывает кадры полёта', async ({ page }) => {
  await expect(warp(page)).toHaveAttribute('data-ready', '');
  await expect.poll(() => paintedLooks(page)).toEqual(['light']);
  await page.locator('header [data-theme-toggle]').click();
  await expect.poll(() => paintedLooks(page)).toEqual(['dark']);
});

test('если движение просили убрать, карточки стоят', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(warp(page)).toHaveAttribute('data-ready', '');
  const state = () => warp(page).locator('.warp-card').evaluateAll((els) => els.map((el) => `${getComputedStyle(el).animationName}|${getComputedStyle(el).transform}`));
  const before = await state();
  expect(before.every((s) => s.startsWith('none|'))).toBe(true);
  await page.waitForTimeout(600);
  expect(await state()).toEqual(before);
  await ctx.close();
});
