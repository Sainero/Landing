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

  // листание внутри показа → вкладка
  await page.frameLocator('[data-showcase] iframe').locator('#nx').click();
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

test('каталог блоков: группы и «Показать все»', async ({ page }) => {
  const catalog = page.locator('[data-catalog]');
  const visible = catalog.locator('[data-group]:visible');
  await expect(visible).toHaveCount(16);
  await catalog.locator('[data-catalog-more]').click();
  const all = await catalog.locator('[data-group]').count();
  await expect(visible).toHaveCount(all);
  await catalog.locator('[data-filter="templates"]').click();
  const templates = await catalog.locator('[data-group="templates"]').count();
  await expect(visible).toHaveCount(templates);
  // в каталоге — названия блоков, а не имена в данных
  await expect(catalog.locator('code')).toHaveCount(0);
});
