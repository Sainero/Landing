// Вырезки блоков со слайдов витрины для раздела «Блоки» на главной → src/assets/blocks/<id>-<light|dark>.webp.
// На сайте не перечисляются все блоки: показаны несколько самых выразительных из разных групп,
// настоящие, со слайдов витрины. Координаты — в системе слайда 1280 × 720; снимок вдвое плотнее
// (deviceScaleFactor 2), чтобы на экранах с высокой плотностью было чётко. Сайт режет их под ширину (Shot).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/** Какие блоки и откуда: slide — номер слайда витрины (с единицы), clip — рамка на слайде */
export const BLOCK_SHOTS = [
  { id: 'charts', slide: 5, clip: { x: 65, y: 111, width: 717, height: 340 } }, // внутри карточки: без рамки в рамке
  { id: 'type', slide: 4, clip: { x: 44, y: 40, width: 1192, height: 516 } },
  { id: 'formulas', slide: 10, clip: { x: 52, y: 156, width: 1176, height: 410 } },
  { id: 'code', slide: 12, clip: { x: 44, y: 132, width: 1192, height: 516 } },
  { id: 'tables', slide: 6, clip: { x: 52, y: 100, width: 1176, height: 510 } },
  { id: 'media', slide: 9, clip: { x: 48, y: 140, width: 1184, height: 506 } },
];

/**
 * @param {import('playwright').Browser} browser
 * @param {string} fileUrl собранный показ витрины (file://…/<имя>.show.html)
 * @param {string} outDir
 * @param {(file: string) => void} done — вызывается с путём каждого готового файла
 */
export async function shootBlocks(browser, fileUrl, outDir, done = (file) => console.log(`✓ ${file}`)) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const look of ['light', 'dark']) {
    for (const { id, slide, clip } of BLOCK_SHOTS) {
      // каждый слайд — в отдельном контексте, как кадры витрины: живые вставки запускаются заново
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 776 }, deviceScaleFactor: 2, colorScheme: look });
      const page = await ctx.newPage();
      await page.goto(`${fileUrl}#${slide}`);
      await page.addStyleTag({ content: '.stage{border:0!important;border-radius:0!important;box-shadow:none!important}.navbar,.progress-top{display:none!important}' });
      await page.waitForTimeout(3500); // графики прорисовались, появления доиграли
      const png = await page.screenshot({ type: 'png', clip });
      const file = path.join(outDir, `${id}-${look}.webp`);
      await sharp(png).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toFile(file);
      done(file);
      await ctx.close();
    }
  }
}
