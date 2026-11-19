// Плавность прокрутки собранного сайта: процессор медленнее в 4 раза (как слабый ноутбук),
// страница прокручивается до конца шагами колеса. Сначала соберите сайт: yarn build.
//   yarn perf                 — главная и две страницы документации
//   yarn perf / /docs/import  — свои адреса
// Скорость загрузки и баллы Lighthouse — в Chrome: DevTools → Lighthouse (на yarn preview, не на yarn dev).
import { chromium } from '@playwright/test';
import { preview } from 'astro';

const PORT = 4339;
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/docs', '/docs/studio'];
const server = await preview({ server: { port: PORT, host: '127.0.0.1' }, logLevel: 'error' });
const channel = process.env.LANDING_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined);
const browser = await chromium.launch({ channel });

const rows = [];
try {
  for (const path of paths) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(() => {
      const w = /** @type {any} */ (window);
      w.__long = 0; w.__frames = [];
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { w.__long += e.duration; })).observe({ type: 'longtask' });
      let last = performance.now();
      const tick = (t) => { w.__frames.push(t - last); last = t; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    const height = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < height; y += 120) { await page.mouse.wheel(0, 120); await page.waitForTimeout(16); }
    await page.waitForTimeout(400);
    const { frames, long } = await page.evaluate(() => ({ frames: /** @type {any} */ (window).__frames.slice(2), long: /** @type {any} */ (window).__long }));
    const sorted = [...frames].sort((a, b) => a - b);
    rows.push({
      'Страница': path,
      'Медиана кадра, мс': Math.round(sorted[Math.floor(sorted.length / 2)]),
      '95 %, мс': Math.round(sorted[Math.floor(sorted.length * 0.95)]),
      'Кадров > 50 мс': frames.filter((x) => x > 50).length,
      'Длинные задачи, мс': Math.round(long),
    });
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.stop();
}
console.table(rows);
console.log('Цель: медиана около 17 мс (60 кадров/с) и ни одного кадра дольше 50 мс.');
