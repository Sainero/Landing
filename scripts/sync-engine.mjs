// Забирает из репозитория Slideria всё, что показывает лендинг:
//   - собранные демо-презентации (для показа, компактные) → public/demo/<имя>.html
//   - их deck.yaml (для показа кода)                    → content/decks/<имя>/deck.yaml
//   - README, справочник компонентов и MCP              → content/docs/*.md (раздел /docs)
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

const root = process.cwd();
const engine = path.resolve(process.env.SLIDERIA_DIR ?? path.join(root, '..', 'HTMLPPTX'));
const DECKS = (process.env.DECKS ?? 'slideria,microclimate').split(',').map((s) => s.trim()).filter(Boolean);
/** Чьи кадры нужны: all — каждого слайда (витрина на первом экране), first — только первого */
const POSTERS = { slideria: { slides: 'all', presenter: true }, microclimate: { slides: 'first' } };
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
// README делится на страницы по заголовкам второго уровня; разделы для разработчиков движка
// (тесты, замеры, структура репозитория) на сайт не попадают
const PAGES = {
  'Быстрый старт': { slug: 'index', title: 'Быстрый старт', group: 'Начало работы', order: 1, intro: true },
  'Приложение для компьютера': { slug: 'app', title: 'Программа для компьютера', group: 'Начало работы', order: 2 },
  'Во время показа': { slug: 'show', title: 'Во время показа', group: 'Начало работы', order: 3 },
  'Редактор (студия)': { slug: 'studio', title: 'Студия', group: 'Работа с презентацией', order: 4 },
  'Режим правки': { slug: 'edit', title: 'Режим правки', group: 'Работа с презентацией', order: 5 },
  'Три способа сделать презентацию': { slug: 'ways', title: 'Три способа сделать презентацию', group: 'Работа с презентацией', order: 6 },
  'Импорт правок из HTML-файла': { slug: 'merge', title: 'Импорт правок из HTML-файла', group: 'Работа с презентацией', order: 7 },
  'Как править презентацию в deck.yaml': { slug: 'editing', title: 'Как править deck.yaml', group: 'Формат deck.yaml', order: 8 },
  'Как добавить свой компонент': { slug: 'custom-components', title: 'Свой компонент', group: 'Формат deck.yaml', order: 10 },
  'Что дальше': { slug: 'roadmap', title: 'Что дальше', group: 'О проекте', order: 20 },
};
const SKIP = new Set(['Автотесты', 'Замеры скорости', 'Структура']);
// Документы из docs/, у которых есть своя страница на сайте
const DOC_PAGES = { 'COMPONENTS.md': '/docs/components', 'MCP.md': '/docs/mcp', 'AGENT.md': '/docs/agent' };

/** Ссылки на страницы сайта сохраняются, на файлы репозитория — превращаются в обычный текст */
function fixLinks(md) {
  return md
    .replace(/<img[^>]*>\s*/g, '')
    // старое рабочее имя папки проекта
    .replace(/HTMLPPTX/g, 'slideria')
    .replace(/(!?)\[([^\]]*)\]\(([^)\s]+)\)/g, (all, bang, text, href) => {
      if (bang) return '';
      // Репозитории на GitHub на сайте не упоминаются ссылками
      if (/^https?:\/\/(www\.)?github\.com\//.test(href)) return text;
      if (/^https?:|^mailto:|^#/.test(href)) return all;
      const [file, hash] = href.split('#');
      const page = DOC_PAGES[path.basename(file)];
      if (page) return `[${text}](${page}${hash ? '#' + hash : ''})`;
      if (file === 'README.md' || file === '../README.md') return `[${text}](/docs${hash ? '#' + hash : ''})`;
      return text.replace(/^`(.*)`$/, '`$1`');
    });
}

const front = (o) => `---\n${Object.entries(o).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n`;
const docsDir = path.join(root, 'content', 'docs');
fs.rmSync(docsDir, { recursive: true, force: true });

const readme = fs.readFileSync(path.join(engine, 'README.md'), 'utf8');
const [head, ...sections] = readme.split(/^## /m);
const intro = head.replace(/<img[^>]*>\s*/g, '').replace(/^# .*\n/m, '').trim();
for (const sec of sections) {
  const nl = sec.indexOf('\n');
  const heading = sec.slice(0, nl).trim();
  const body = sec.slice(nl + 1).trim();
  if (SKIP.has(heading)) continue;
  const page = PAGES[heading];
  if (!page) {
    console.warn(`! раздел README «${heading}» не привязан к странице — добавьте его в PAGES или SKIP в scripts/sync-engine.mjs`);
    continue;
  }
  const { slug, intro: withIntro, ...meta } = page;
  const text = withIntro ? `${intro}\n\n## Установка и запуск\n\n${body}` : body;
  write(path.join(docsDir, `${slug}.md`), front(meta) + fixLinks(text) + '\n');
}

const extra = [
  { file: 'COMPONENTS.md', slug: 'components', meta: { title: 'Справочник компонентов', group: 'Формат deck.yaml', order: 9, description: 'Шаблоны слайдов и блоки: поля и примеры YAML' } },
  { file: 'AGENT.md', slug: 'agent', meta: { title: 'Агент в студии', group: 'Агенты', order: 11 } },
  { file: 'MCP.md', slug: 'mcp', meta: { title: 'MCP: Claude правит презентации', group: 'Агенты', order: 12 } },
];
for (const x of extra) {
  const md = fs.readFileSync(path.join(engine, 'docs', x.file), 'utf8').replace(/^# .*\n/, '').trim();
  write(path.join(docsDir, `${x.slug}.md`), front(x.meta) + fixLinks(md) + '\n');
}

// ---------- версия ----------
let commit = null;
try { commit = run('git', ['rev-parse', '--short', 'HEAD']); } catch { /* не git */ }
const pkg = JSON.parse(fs.readFileSync(path.join(engine, 'package.json'), 'utf8'));
const meta = { version: pkg.version, commit, syncedAt: new Date().toISOString().slice(0, 10), decks };
write(path.join(root, 'content', 'engine.json'), JSON.stringify(meta, null, 2) + '\n');
