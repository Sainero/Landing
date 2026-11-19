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

test('вкладки листают кадры и YAML витрины', async ({ page }) => {
  const studio = page.locator('[data-studio]');
  await studio.locator('[data-slide-tab="3"]').click();
  await expect(studio.locator('[data-slide-tab="3"]')).toHaveAttribute('aria-selected', 'true');
  await expect(studio.locator('[data-poster] img[data-look="light"]')).toHaveAttribute('src', /light-4\.webp$/);
  await expect(studio.locator('[data-studio-counter]')).toHaveText('слайд 4 / 14');
  await expect(studio.locator('[data-yaml-view] .line').first()).toContainText('- id:');
  await expect(studio.locator('[data-poster-count]')).toHaveText('4 из 14');
});

test('«Запустить показ» открывает витрину на том же слайде, дальше всё синхронно', async ({ page }) => {
  const done = watchErrors(page);
  const studio = page.locator('[data-studio]');
  await studio.locator('[data-slide-tab="3"]').click();
  await studio.locator('[data-live-start]').click();
  const counter = deckCounter(page, '[data-studio] iframe');
  await expect(counter).toHaveText('4 из 14');
  await expect(studio.locator('[data-poster]')).toHaveCount(0);

  // вкладка → слайд показа
  await studio.locator('[data-slide-tab="6"]').click();
  await expect(counter).toHaveText('7 из 14');

  // листание внутри показа → вкладка и YAML
  await page.frameLocator('[data-studio] iframe').locator('#nx').click();
  await expect(studio.locator('[data-slide-tab="7"]')).toHaveAttribute('aria-selected', 'true');
  await expect(studio.locator('[data-studio-counter]')).toHaveText('слайд 8 / 14');
  done();
});

test('тема сайта передаётся в запущенную презентацию', async ({ page }) => {
  await page.locator('[data-studio] [data-live-start]').click();
  await expect(deckCounter(page, '[data-studio] iframe')).toHaveText('1 из 14');
  const before = await page.locator('html').getAttribute('data-theme');
  const after = before === 'dark' ? 'light' : 'dark';
  await page.locator('header [data-theme-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', after);
  await expect(page.frameLocator('[data-studio] iframe').locator('html')).toHaveAttribute('data-theme', after);
});

test('окно докладчика запускается по щелчку и идёт за витриной', async ({ page }) => {
  await page.locator('[data-studio] [data-live-start]').click();
  await expect(deckCounter(page, '[data-studio] iframe')).toHaveText('1 из 14');
  await page.locator('[data-studio] [data-slide-tab="4"]').click();
  await expect(deckCounter(page, '[data-studio] iframe')).toHaveText('5 из 14');

  await page.locator('[data-presenter-live]').click();
  await expect(page.frameLocator('[data-presenter-preview] iframe').locator('#ct')).toHaveText('5 / 14', { timeout: 15_000 });
});

test('пример: пункт оглавления запускает показ на этом слайде', async ({ page }) => {
  const viewer = page.locator('[data-viewer]');
  await viewer.scrollIntoViewIfNeeded();
  await viewer.locator('[data-viewer-tab="4"]').click();
  await expect(deckCounter(page, '[data-viewer] iframe')).toHaveText(/^5 из \d+$/);
  await expect(viewer.locator('[data-viewer-tab="4"]')).toHaveAttribute('aria-current', 'true');
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
