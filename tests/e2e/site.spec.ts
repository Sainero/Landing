// Сайт целиком: страницы, ссылки, якоря, и правило «как в production» — без ручек к коду
import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

/** Все страницы, до которых можно дойти по ссылкам с главной и из документации */
async function crawl(page: import('@playwright/test').Page) {
  const pages = new Map<string, { ids: string[]; links: { href: string; text: string }[] }>();
  const queue = ['/', '/docs'];
  while (queue.length) {
    const path = queue.shift()!;
    if (pages.has(path)) continue;
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    const data = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('[id]')].map((e) => e.id),
      links: [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href')!, text: a.textContent!.trim().slice(0, 40) })),
    }));
    pages.set(path, data);
    for (const { href } of data.links) {
      const target = href.split('#')[0].replace(/\/$/, '') || '/';
      if (href.startsWith('/') && !href.startsWith('/demo/') && (target === '/' || target.startsWith('/docs'))) queue.push(target);
    }
  }
  return pages;
}

test('все ссылки и якоря на сайте ведут куда надо', async ({ page, request }) => {
  test.setTimeout(120_000);
  const pages = await crawl(page);
  expect(pages.size).toBeGreaterThanOrEqual(9);
  const broken: string[] = [];
  for (const [from, { links }] of pages) {
    for (const { href, text } of links) {
      if (!href.startsWith('/') && !href.startsWith('#')) continue;
      const [path, hash] = href.split('#');
      const target = path ? path.replace(/\/$/, '') || '/' : from;
      if (path && !pages.has(target)) {
        const r = await request.get(path);
        if (r.status() !== 200) broken.push(`${from} → ${href}: HTTP ${r.status()}`);
      }
      if (hash && pages.has(target) && !pages.get(target)!.ids.includes(decodeURIComponent(hash))) {
        broken.push(`${from} → ${href} («${text}»): нет такого раздела`);
      }
    }
  }
  expect(broken, broken.join('\n')).toEqual([]);
});

test('на сайте нет ссылок на GitHub', async ({ page }) => {
  for (const path of (await crawl(page)).keys()) {
    await page.goto(path);
    await expect(page.locator('a[href*="github.com"]'), path).toHaveCount(0);
  }
});

test('документация говорит с пользователем: ни команд, ни путей к файлам, ни флагов', async ({ page }) => {
  const docs = [...(await crawl(page)).keys()].filter((p) => p.startsWith('/docs'));
  expect(docs.length).toBeGreaterThanOrEqual(8);
  const code = /\b(yarn|npx|npm|pnpm)\b|node_modules|\b(src|scripts|server|plugins|desktop|tests)\/|\.(mjs|cjs|tsx?)\b|deck\.yaml|\bYAML\b|\?deck=|(^|\s)--[a-z]{2,}|\bSLIDERIA_[A-Z_]+/m;
  const found: string[] = [];
  for (const path of docs) {
    await page.goto(path);
    const text = await page.locator('article').innerText();
    const m = text.match(code);
    if (m) found.push(`${path}: «…${text.slice(Math.max(0, m.index! - 40), m.index! + 40).replace(/\s+/g, ' ')}…»`);
  }
  expect(found, found.join('\n')).toEqual([]);
});

test('страницы документации открываются без ошибок, у каждой заголовок и пункт в меню', async ({ page }) => {
  const done = watchErrors(page);
  await page.goto('/docs');
  const nav = page.locator('aside nav a');
  const hrefs = await nav.evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
  expect(hrefs.length).toBeGreaterThanOrEqual(8);
  for (const href of hrefs) {
    await page.goto(href);
    await expect(page.locator('article h1')).not.toBeEmpty();
    await expect(page.locator(`aside nav a[aria-current="page"]`)).toHaveAttribute('href', href);
  }
  done();
});

test('длинные таблицы «что — как» показаны списком, короткие остаются таблицами', async ({ page }) => {
  await page.goto('/docs/studio');
  await expect(page.locator('article dl.features').first()).toBeVisible();
  await page.goto('/docs/show');
  await expect(page.locator('article table').first()).toBeVisible();
});

test('несуществующий адрес — страница «не найдено»', async ({ page }) => {
  const res = await page.goto('/net-takoj-stranicy');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('404');
});

test('sitemap и robots.txt', async ({ request }) => {
  expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Sitemap:');
});
