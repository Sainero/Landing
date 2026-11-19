// Забирает из репозитория Slideria всё, что показывает лендинг:
//   - собранные демо-презентации (для показа, компактные) → public/demo/<имя>.html
//   - их deck.yaml (для показа кода)                    → content/decks/<имя>/deck.yaml
//   - разделы README и docs/ о работе в программе        → content/docs/*.md (раздел /docs)
//   - справочник компонентов (данные каталога блоков)    → content/catalog/components.md
//   - кадры слайдов и окна докладчика (светлые и тёмные)  → public/demo/posters/<имя>/*.webp
//   - версия программы                                  → content/engine.json
//
// Кадры нужны, чтобы страница не запускала тяжёлые презентации сразу: до щелчка «Запустить показ»
// вместо них — картинки. Снимаются в режиме снимка проигрывателя (?shot=…, как для агента в Slideria)
// через Playwright из репозитория Slideria; на Windows — установленный Microsoft Edge, как в его тестах.
// Другой браузер: SLIDERIA_CHROME=/путь/к/chrome. Флаги: --skip-build — не пересобирать презентации,
// --no-posters — не снимать кадры (останутся прежние).
//
// Лендинг не зависит от кода Slideria: в репозиторий кладутся только результаты.
// Ссылки на файлы репозитория из документации убираются: на сайте остаётся только текст.
//
// Запуск: yarn sync:engine                       (репозиторий рядом: ../HTMLPPTX)
//         SLIDERIA_DIR=/path/to/repo yarn sync:engine
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { dropDeadAnchors, fixLinks, forUsers, keepSections, section } from './lib/docs-transform.mjs';

const root = process.cwd();
const engine = path.resolve(process.env.SLIDERIA_DIR ?? path.join(root, '..', 'HTMLPPTX'));
const DECKS = (process.env.DECKS ?? 'slideria').split(',').map((s) => s.trim()).filter(Boolean);
/** Чьи кадры нужны: all — каждого слайда (витрина на первом экране), first — только первого */
const POSTERS = { slideria: { slides: 'all', presenter: true } };
const args = new Set(process.argv.slice(2));

if (!fs.existsSync(path.join(engine, 'package.json'))) {
  console.error(`Не найден репозиторий Slideria: ${engine}\nУкажите путь: SLIDERIA_DIR=/path/to/repo yarn sync:engine`);
  process.exit(1);
}

const run = (cmd, args, env = {}) => execFileSync(cmd, args, {
  cwd: engine, stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, ...env },
}).toString().trim();
const rel = (p) => path.relative(root, p);
const write = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  console.log(`✓ ${rel(file)}`);
};

// ---------- демо-презентации ----------
if (!fs.existsSync(path.join(engine, 'node_modules'))) {
  console.log('… устанавливаю зависимости Slideria (без загрузки Electron)');
  run('yarn', ['install', '--frozen-lockfile'], { ELECTRON_SKIP_BINARY_DOWNLOAD: '1' });
}
if (!args.has('--skip-build')) {
  console.log(`… собираю презентации: ${DECKS.join(', ')}`);
  // --clean — без режима правки (файл легче), --compact — картинки в WebP
  run('node', ['scripts/build.mjs', ...DECKS, '--clean', '--compact']);
}

const decks = [];
for (const name of DECKS) {
  const html = path.join(engine, 'dist', `${name}.show.html`);
  write(path.join(root, 'public', 'demo', `${name}.html`), fs.readFileSync(html));
  write(path.join(root, 'content', 'decks', name, 'deck.yaml'), fs.readFileSync(path.join(engine, 'presentations', name, 'deck.yaml')));
  const yaml = fs.readFileSync(path.join(engine, 'presentations', name, 'deck.yaml'), 'utf8');
  const slides = (yaml.split(/^slides:\s*$/m)[1] ?? '').match(/^  - /gm)?.length ?? 0;
  decks.push({ name, sizeKb: Math.round(fs.statSync(html).size / 1024), slides });
}

if (!args.has('--no-posters')) await shootPosters();

// ---------- кадры ----------
async function launchBrowser() {
  const req = createRequire(path.join(engine, 'package.json'));
  let pw;
  try { pw = req('@playwright/test'); } catch { try { pw = req('playwright'); } catch { return null; } }
  const opts = { headless: true };
  if (process.env.SLIDERIA_CHROME) opts.executablePath = process.env.SLIDERIA_CHROME;
  else if (process.platform === 'win32') opts.channel = 'msedge';
  try {
    return await pw.chromium.launch(opts);
  } catch (e) {
    console.warn(`! браузер для кадров не запустился: ${String(e.message).split('\n')[0]}`);
    return null;
  }
}

async function webp(png, file) {
  await sharp(png).webp({ quality: 74, effort: 6 }).toFile(file);
  console.log(`✓ ${rel(file)}`);
}

async function shootPosters() {
  const browser = await launchBrowser();
  if (!browser) {
    console.warn('! кадры не сняты: нужен Playwright из репозитория Slideria (yarn install там) — остались прежние');
    return;
  }
  try {
    for (const [name, want] of Object.entries(POSTERS)) {
      if (!decks.find((d) => d.name === name)) continue;
      const file = pathToFileURL(path.join(engine, 'dist', `${name}.show.html`)).href;
      const out = path.join(root, 'public', 'demo', 'posters', name);
      fs.rmSync(out, { recursive: true, force: true });
      fs.mkdirSync(out, { recursive: true });
      const count = want.slides === 'all' ? decks.find((d) => d.name === name).slides : 1;
      for (const look of ['light', 'dark']) {
        // Снимается настоящий показ, а не режим снимка ?shot: в нём не применяется акцент темы презентации.
        // Окно 1280 × 776 — сцена ровно 1280 × 720 над панелью показа; рамка и панель скрыты.
        // Каждый слайд — в отдельном контексте браузера: после другого слайда живые вставки
        // (частицы на «Спасибо») не запускаются
        const open = async (url, viewport) => {
          const ctx = await browser.newContext({ viewport, colorScheme: look });
          const page = await ctx.newPage();
          await page.goto(url);
          await page.addStyleTag({ content: '.stage{border:0!important;border-radius:0!important;box-shadow:none!important}.navbar,.progress-top{display:none!important}' });
          await page.waitForTimeout(3000); // анимации появления доигрывают
          return { ctx, page };
        };
        for (let k = 0; k < count; k++) {
          const { ctx, page } = await open(`${file}#${k + 1}`, { width: 1280, height: 776 });
          await webp(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1280, height: 720 } }), path.join(out, `${look}-${k + 1}.webp`));
          await ctx.close();
        }
        if (want.presenter) {
          // Окно докладчика, второй слайд — чтобы были видны и текущий, и следующий
          const { ctx, page } = await open(`${file}?view=presenter#2`, { width: 1280, height: 760 });
          await webp(await page.screenshot({ type: 'png' }), path.join(out, `presenter-${look}.webp`));
          await ctx.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

// ---------- документация ----------
// Сайт говорит с пользователем программы, а не с разработчиком: из README и docs/ Slideria берутся только
// разделы о работе в программе, а команды, пути и устройство кода вычищаются (scripts/lib/docs-transform.mjs).
// «Начало работы» и «Подключить агента» написаны для сайта отдельно — content/guide/.
const docsDir = path.join(root, 'content', 'docs');
fs.rmSync(docsDir, { recursive: true, force: true });

const readme = fs.readFileSync(path.join(engine, 'README.md'), 'utf8');
const doc = (name) => fs.readFileSync(path.join(engine, 'docs', name), 'utf8').replace(/^# .*\n/, '');
const front = (o) => `---\n${Object.entries(o).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n`;
// Ссылки на документы программы, у которых есть страница на сайте
const LINKED = { 'AGENT.md': '/docs/agent', 'MCP.md': '/docs/mcp' };
const page = (slug, meta, md, replace = []) => {
  let text = dropDeadAnchors(fixLinks(forUsers(md), LINKED));
  for (const [a, b] of replace) text = text.replace(a, b);
  write(path.join(docsDir, `${slug}.md`), front(meta) + text + '\n');
};

// Разделы README: какие публикуются, а какие — для разработчиков программы
const USED = ['Во время показа', 'Редактор (студия)', 'Режим правки', 'Три способа сделать презентацию', 'Импорт правок из HTML-файла', 'Что дальше'];
const DEV_ONLY = ['Быстрый старт', 'Приложение для компьютера', 'Автотесты', 'Замеры скорости', 'Как править презентацию в deck.yaml', 'Как добавить свой компонент', 'Структура'];
for (const m of readme.matchAll(/^## (.+)$/gm)) {
  const title = m[1].trim();
  if (!USED.includes(title) && !DEV_ONLY.includes(title)) {
    console.warn(`! новый раздел README «${title}»: решите, нужен ли он на сайте (USED или DEV_ONLY в scripts/sync-engine.mjs)`);
  }
}

page('show', { title: 'Во время показа', group: 'Начало работы', order: 2 }, section(readme, 'Во время показа'));
page('studio', { title: 'Студия', group: 'Работа с презентацией', order: 3 }, section(readme, 'Редактор (студия)'));
page('edit', { title: 'Режим правки', group: 'Работа с презентацией', order: 4, description: 'Правка прямо в показе и в присланном HTML-файле' },
  section(readme, 'Режим правки'),
  [['можно вернуть в проект — см. следующий раздел', 'переносятся обратно в презентацию — см. [«Импорт» → «Правки из присланного файла»](/docs/import#правки-из-присланного-файла)']]);

const ways = section(readme, 'Три способа сделать презентацию');
page('import', { title: 'Импорт', group: 'Работа с презентацией', order: 5, description: 'PowerPoint, HTML и Claude Design — в редактируемые слайды' }, [
  'Готовую презентацию не нужно переделывать: перетащите файл на страницу «Все презентации» или нажмите «Импорт». Окно покажет, что получится и что стоит проверить, — и ничего не запишет, пока вы не нажмёте «Импортировать».',
  '## Из PowerPoint',
  section(ways, 'Из PowerPoint', 3),
  '## Из HTML и Claude Design',
  'Каркас нарисовали мышью в Claude Design или презентацию сверстал Claude в чате — импорт превратит её в слайды Slideria. Окно предложит привязать цвета к теме, чтобы работали тёмная тема и смена акцента.',
  section(ways, 'Живые слайды: любой HTML как есть', 3),
  '## Правки из присланного файла',
  'Отправили презентацию HTML-файлом с правкой, коллега поправил текст и картинки прямо в браузере и прислал файл обратно — перетащите его на страницу «Все презентации». Окно покажет, какие слайды изменены, добавлены и удалены и какие появятся картинки: «Импортировать» — записать, «Отмена» — ничего не трогать.',
  section(readme, 'Импорт правок из HTML-файла').replace(/^[\s\S]*?Как это работает:\s*/, ''),
].join('\n\n'));

page('agent', { title: 'Агент в студии', group: 'Агенты', order: 6, description: 'Чат с моделью, которая правит открытую презентацию' },
  keepSections(doc('AGENT.md'), ['Где', 'Сервисы', 'Голос', 'Дальше']));
page('roadmap', { title: 'Что дальше', group: 'О проекте', order: 9 }, section(readme, 'Что дальше'));

// Справочник компонентов — не страница, а данные для каталога блоков на главной
write(path.join(root, 'content', 'catalog', 'components.md'), doc('COMPONENTS.md'));

// ---------- версия ----------
let commit = null;
try { commit = run('git', ['rev-parse', '--short', 'HEAD']); } catch { /* не git */ }
const pkg = JSON.parse(fs.readFileSync(path.join(engine, 'package.json'), 'utf8'));
const meta = { version: pkg.version, commit, syncedAt: new Date().toISOString().slice(0, 10), decks };
write(path.join(root, 'content', 'engine.json'), JSON.stringify(meta, null, 2) + '\n');
