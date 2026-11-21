// Галерея блоков для сайта: небольшие презентации в теме витрины Slideria (content/gallery/<имя>/deck.yaml)
// с блоками, которых нет на витрине, — Гант, матрица рисков, тест, дорожная карта, схема из текста…
// Их собирает сам движок Slideria, а сайт показывает кадры: раздел «Блоки», полёт слайдов, карточки «Три способа».
//
// Если презентации галереи понадобятся свои шрифты (fonts: в deck.yaml), их файлы в репозиторий сайта не кладутся:
// перед сборкой они копируются из программы (src/fonts, лицензия OFL) во временную папку рядом с копией презентаций.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import YAML from 'yaml';

/** Что сделать на слайде перед снимком: щёлкнуть по селектору (тест — уже с ответом) */
export const GALLERY_ACTIONS = {
  'lesson/1': { click: '.slide.on .qz-o:has-text("Митохондрия")' },
};

/** Папки презентаций галереи в content/gallery */
export function galleryDecks(root) {
  const dir = path.join(root, 'content', 'gallery');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'deck.yaml'))).sort();
}

/**
 * Собрать галерею движком: копия презентаций во временной папке, шрифты — из программы.
 * @returns {{ name: string, file: string, slides: number }[]}
 */
export function buildGallery({ root, engine, run, log = console.log }) {
  const decks = galleryDecks(root);
  if (!decks.length) return [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'landing-gallery-'));
  const out = [];
  for (const name of decks) {
    const src = path.join(root, 'content', 'gallery', name);
    const dst = path.join(tmp, name);
    fs.cpSync(src, dst, { recursive: true });
    const deck = YAML.parse(fs.readFileSync(path.join(src, 'deck.yaml'), 'utf8'));
    for (const f of deck.fonts ?? []) {
      const file = path.basename(f.src);
      const from = path.join(engine, 'src', 'fonts', file);
      if (!fs.existsSync(from)) { log(`! галерея ${name}: нет шрифта ${file} в программе`); continue; }
      fs.mkdirSync(path.join(dst, 'assets'), { recursive: true });
      fs.copyFileSync(from, path.join(dst, 'assets', file));
    }
    const file = path.join(tmp, 'dist', `${name}.html`);
    run('node', ['scripts/build.mjs', name, '--clean', '--compact', `--out=${file}`], { SLIDERIA_DECKS: tmp });
    out.push({ name, file, slides: deck.slides?.length ?? 0 });
  }
  return out;
}

/**
 * Кадры галереи в обеих темах:
 *   src/assets/gallery/<имя>-<n>-<light|dark>.webp      — 1600 px, для раздела «Блоки» (сайт режет под экран)
 *   public/demo/gallery/thumbs/<имя>-<n>-<light|dark>.webp — 640 × 360, для полёта и карточек
 * Каждый слайд — в своём контексте браузера, как кадры витрины: живые вставки запускаются заново.
 */
export async function shootGallery(browser, built, { root, done = (f) => console.log(`✓ ${f}`) }) {
  const big = path.join(root, 'src', 'assets', 'gallery');
  const small = path.join(root, 'public', 'demo', 'gallery', 'thumbs');
  for (const dir of [big, small]) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }
  for (const { name, file, slides } of built) {
    for (const look of ['light', 'dark']) {
      for (let n = 1; n <= slides; n++) {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 776 }, deviceScaleFactor: 2, colorScheme: look });
        const page = await ctx.newPage();
        await page.goto(`file://${file}#${n}`);
        await page.addStyleTag({ content: '.stage{border:0!important;border-radius:0!important;box-shadow:none!important}.navbar,.progress-top{display:none!important}' });
        await page.waitForTimeout(3000); // появления доиграли, графики прорисовались
        const act = GALLERY_ACTIONS[`${name}/${n}`];
        if (act?.click) {
          await page.locator(act.click).first().click();
          await page.waitForTimeout(1200);
        }
        const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1280, height: 720 } });
        const base = `${name}-${n}-${look}.webp`;
        await sharp(png).resize({ width: 1600 }).webp({ quality: 80, effort: 6 }).toFile(path.join(big, base));
        await sharp(png).resize({ width: 640 }).webp({ quality: 72, effort: 6 }).toFile(path.join(small, base));
        done(path.join(big, base));
        await ctx.close();
      }
    }
  }
}
