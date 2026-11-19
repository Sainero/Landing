// Превращение документации разработчика Slideria (README, docs/*.md) в страницы для пользователей сайта.
// Сайт говорит как продукт: что нажать в программе. Команды терминала, пути к файлам репозитория,
// флаги и устройство кода на сайт не попадают — с кодом работает разве что агент через MCP.

/**
 * Признаки ручки к коду: команда терминала, путь в репозитории, файл, данные презентации (deck.yaml,
 * «поле: значение»), ссылка на файл репозитория, адрес с параметрами, флаг, переменная окружения, сборка
 */
const DEV = [
  /\b(yarn|npx|npm|pnpm)\b/i,
  /`node\s/,
  new RegExp(`\`[^\`\\n]{0,60}\\b(src|scripts|server|plugins|desktop|tests|templates|presentations|node_modules|dist|library|player|docs)/[^\`\\n]{0,60}\``),
  /`[^`\s]{1,60}\.(ts|tsx|mjs|cjs|js|json|css|md|cmd|ps1)`/,
  /deck\.yaml|\bYAML\b/,
  /`[a-z][\w-]*:\s?[^`\n]{0,40}`/,
  // поле, путь или выражение кода: `texts`, `assets/`, `data-theme`, `var(--ac)`, `section.slide`
  /`[a-z][\w.\-/()]*`/,
  /\]\((?!https?:|#|\/|mailto:)[^)\s]+\)/,
  /\?(deck|view|shot|studio|remote)\b|&studio\b/,
  /(^|\s|`)--[a-z][a-z-]+/,
  /\b(Vite|Playwright|electron-builder|app\.asar|GitLab|GitHub Actions)\b/,
  /\b[A-Z][A-Z0-9]*_[A-Z0-9_]{2,}\b/,
];

export const isDev = (text) => DEV.some((re) => re.test(text));

/** Части текста: предложения, а в них — части через «;» */
const sentences = (text) => text.split(/(?<=[.!?])\s+(?=[«"(*`A-ZА-ЯЁ])/);

/**
 * Текст без ручек к коду: убираются скобки, части через «;» и предложения, где они есть.
 * Если ручка — в первом предложении, пусто: строка таблицы или абзац уходят целиком
 */
export function cleanText(text) {
  let t = text;
  let prev;
  do { prev = t; t = t.replace(/\s?\([^()]*\)/g, (m) => (isDev(m) ? '' : m)); } while (t !== prev);
  const all = sentences(t);
  // ручка к коду в первом, главном предложении — без него остальное теряет смысл
  if (isDev(all[0].split(/;\s+/)[0])) return '';
  const kept = all
    .map((sentence) => {
      const parts = sentence.split(/;\s+/);
      const ok = parts.filter((p) => !isDev(p));
      if (ok.length === parts.length) return sentence;
      if (!ok.length) return '';
      const joined = ok.join('; ').replace(/[,;:\s—–-]+$/, '');
      return /[.!?]$/.test(joined) ? joined : joined + '.';
    })
    .filter(Boolean);
  return kept.join(' ').trim();
}

/** Строка Markdown: абзац, пункт списка или строка таблицы (так написан README) */
function cleanLine(line) {
  if (!line.trim() || /^#{1,6} /.test(line) || /^\|[\s|:-]+\|$/.test(line)) return line;
  if (line.startsWith('|')) {
    const cells = line.slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim());
    if (isDev(cells[0])) return null;
    const cleaned = cells.map((c, i) => (i === 0 ? c : cleanText(c)));
    if (cleaned.slice(1).every((c) => !c)) return null;
    return `| ${cleaned.join(' | ')} |`;
  }
  const m = line.match(/^(\s*(?:[-*]|\d+\.)\s+|\s*>\s*)?(.*)$/);
  const body = cleanText(m[2]);
  return body ? (m[1] ?? '') + body : null;
}

/**
 * Документ для пользователей: без блоков кода и ручек к коду; таблицы без строк — без шапки,
 * разделы, оставшиеся пустыми, — без заголовка.
 */
export function forUsers(md) {
  const out = [];
  let fence = false;
  for (const line of md.split('\n')) {
    if (/^\s*```/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    const cleaned = cleanLine(line);
    if (cleaned !== null) out.push(cleaned);
  }
  // таблица, от которой остались шапка и разделитель
  let text = out.join('\n').replace(/^\|[^\n]*\|\n\|[\s|:-]+\|\n(?!\|)/gm, '');
  // заголовок без содержимого: за ним сразу заголовок того же или более высокого уровня или конец
  let prev;
  do {
    prev = text;
    text = text.replace(/^(#{2,4}) [^\n]*\n+(?=(#{1,4}) |\s*(?![\s\S]))/gm, (all, h, next) => (next === undefined || next.length <= h.length ? '' : all));
  } while (text !== prev);
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Раздел нужного уровня по заголовку — без самого заголовка, до следующего заголовка того же
 * или более высокого уровня; нет такого раздела — пустая строка
 */
export function section(md, title, level = 2) {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => l === `${'#'.repeat(level)} ${title}` || l.trimEnd() === `${'#'.repeat(level)} ${title}`);
  if (start < 0) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => { const m = l.match(/^(#{1,6}) /); return m && m[1].length <= level; });
  return (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
}

/** Только нужные разделы второго уровня (вступление до первого «## » остаётся) */
export function keepSections(md, titles) {
  const [head, ...sections] = md.split(/^## /m);
  const kept = sections.filter((s) => titles.includes(s.slice(0, s.indexOf('\n')).trim()));
  return [head.trimEnd(), ...kept.map((s) => '## ' + s.trimEnd())].join('\n\n');
}

/**
 * Ссылки: на опубликованные страницы — адресом сайта, на остальные файлы репозитория и на GitHub —
 * обычным текстом, картинки из репозитория — убираются.
 * pages — какой файл документации на какой странице сайта: { 'MCP.md': '/docs/mcp' }
 */
export function fixLinks(md, pages = {}) {
  return md
    .replace(/<img[^>]*>\s*/g, '')
    .replace(/HTMLPPTX/g, 'slideria')
    .replace(/(!?)\[([^\]]*)\]\(([^)\s]+)\)/g, (all, bang, text, href) => {
      if (bang) return '';
      if (/^https?:\/\/(www\.)?github\.com\//.test(href)) return text;
      if (/^https?:|^mailto:|^#/.test(href)) return all;
      const [file, hash] = href.split('#');
      const name = file.split('/').pop();
      const page = pages[name];
      if (page) return `[${text}](${page}${hash ? '#' + hash : ''})`;
      return text;
    });
}

/** Якорь заголовка, как его строит Astro (github-slugger): строчные буквы, пробелы — дефисы, без знаков */
export const slug = (title) => title.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-');

/** Ссылка на раздел этой же страницы, которого на сайте нет (раздел для разработчиков убран), — текстом */
export function dropDeadAnchors(md) {
  const ids = new Set([...md.matchAll(/^#{1,6} (.+)$/gm)].map((m) => slug(m[1].replace(/[`*]/g, ''))));
  return md.replace(/\[([^\]]*)\]\(#([^)]+)\)/g, (all, text, hash) => (ids.has(decodeURIComponent(hash)) ? all : text));
}
