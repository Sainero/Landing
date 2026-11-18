// Забирает из репозитория движка всё, что показывает лендинг:
//   - собранные демо-презентации     → public/demo/<имя>.html
//   - их deck.yaml (для показа кода)  → content/decks/<имя>/deck.yaml
//   - README и справочник компонентов → content/docs/*.md (раздел /docs)
//   - сведения о версии               → content/engine.json
//
// Лендинг не зависит от кода движка: в репозиторий кладутся только результаты.
// Запуск: yarn sync:engine                       (движок рядом: ../HTMLPPTX)
//         HTMLPPTX_DIR=/path/to/HTMLPPTX yarn sync:engine
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const engine = path.resolve(process.env.HTMLPPTX_DIR ?? path.join(root, '..', 'HTMLPPTX'));
const DECKS = (process.env.DECKS ?? 'tour,microclimate').split(',').map((s) => s.trim()).filter(Boolean);

if (!fs.existsSync(path.join(engine, 'package.json'))) {
  console.error(`Не найден репозиторий движка: ${engine}\nУкажите путь: HTMLPPTX_DIR=/path/to/HTMLPPTX yarn sync:engine`);
  process.exit(1);
}

const run = (cmd, args) => execFileSync(cmd, args, { cwd: engine, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
const rel = (p) => path.relative(root, p);
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  console.log(`✓ ${rel(file)}`);
};

// ---------- демо-презентации ----------
if (!fs.existsSync(path.join(engine, 'node_modules'))) {
  console.log('… устанавливаю зависимости движка');
  run('yarn', ['install', '--frozen-lockfile']);
}
console.log(`… собираю презентации: ${DECKS.join(', ')}`);
run('node', ['scripts/build.mjs', ...DECKS]);

const decks = [];
for (const name of DECKS) {
  const html = path.join(engine, 'dist', `${name}.html`);
  write(path.join(root, 'public', 'demo', `${name}.html`), fs.readFileSync(html));
  write(path.join(root, 'content', 'decks', name, 'deck.yaml'), fs.readFileSync(path.join(engine, 'presentations', name, 'deck.yaml')));
  decks.push({ name, sizeKb: Math.round(fs.statSync(html).size / 1024) });
}

// ---------- документация ----------
// README делится на страницы по заголовкам второго уровня
const PAGES = {
  'Быстрый старт': { slug: 'index', title: 'Быстрый старт', group: 'Начало работы', order: 1, intro: true },
  'Во время показа': { slug: 'show', title: 'Во время показа', group: 'Начало работы', order: 2 },
  'Как править презентацию': { slug: 'editing', title: 'Как править презентацию', group: 'Презентации', order: 3 },
  'Как добавить свой компонент': { slug: 'custom-components', title: 'Свой компонент', group: 'Разработка', order: 5 },
  'Структура': { slug: 'structure', title: 'Структура проекта', group: 'Разработка', order: 6 },
  'Что дальше': { slug: 'roadmap', title: 'Что дальше', group: 'Разработка', order: 7 },
};

const fixLinks = (md) => md
  .replace(/\]\((?:\.\.\/)?docs\/COMPONENTS\.md\)/g, '](/docs/components)')
  .replace(/\]\(README\.md\)/g, '](/docs)');

const front = (o) => `---\n${Object.entries(o).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n`;
const docsDir = path.join(root, 'content', 'docs');
fs.rmSync(docsDir, { recursive: true, force: true });

const readme = fs.readFileSync(path.join(engine, 'README.md'), 'utf8');
const [head, ...sections] = readme.split(/^## /m);
const intro = head.replace(/^# .*\n/, '').trim();
for (const sec of sections) {
  const nl = sec.indexOf('\n');
  const heading = sec.slice(0, nl).trim();
  const body = sec.slice(nl + 1).trim();
  const page = PAGES[heading];
  if (!page) {
    console.warn(`! раздел README «${heading}» не привязан к странице — добавьте его в PAGES в scripts/sync-engine.mjs`);
    continue;
  }
  const { slug, intro: withIntro, ...meta } = page;
  const text = withIntro ? `${intro}\n\n## Установка и запуск\n\n${body}` : body;
  write(path.join(docsDir, `${slug}.md`), front(meta) + fixLinks(text) + '\n');
}

const components = fs.readFileSync(path.join(engine, 'docs', 'COMPONENTS.md'), 'utf8').replace(/^# .*\n/, '').trim();
write(path.join(docsDir, 'components.md'),
  front({ title: 'Справочник компонентов', group: 'Презентации', order: 4, description: 'Шаблоны слайдов и блоки: поля и примеры YAML' })
  + fixLinks(components) + '\n');

// ---------- версия ----------
let commit = null;
try { commit = run('git', ['rev-parse', '--short', 'HEAD']); } catch { /* не git */ }
const pkg = JSON.parse(fs.readFileSync(path.join(engine, 'package.json'), 'utf8'));
const meta = { version: pkg.version, commit, syncedAt: new Date().toISOString().slice(0, 10), decks };
write(path.join(root, 'content', 'engine.json'), JSON.stringify(meta, null, 2) + '\n');
