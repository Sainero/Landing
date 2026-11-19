import fs from 'node:fs/promises';
import path from 'node:path';

export type CatalogGroup = 'templates' | 'layout' | 'data' | 'live' | 'html';

export interface CatalogItem {
  /** Типы блоков из заголовка: `donut`, `hbars`… */
  types: string[];
  title: string;
  text: string;
  group: CatalogGroup;
  /** Якорь в /docs/components (первый тип в заголовке) */
  anchor: string;
}

const GROUPS: Record<string, CatalogGroup> = {
  'Шаблоны слайдов': 'templates',
  'Раскладка': 'layout',
  'Карточки и данные': 'data',
  'Живая графика': 'live',
  'Готовая вёрстка': 'html',
};

export const catalogGroups: { id: CatalogGroup; label: string }[] = [
  { id: 'live', label: 'Живая графика' },
  { id: 'data', label: 'Карточки и данные' },
  { id: 'layout', label: 'Раскладка' },
  { id: 'templates', label: 'Шаблоны слайдов' },
  { id: 'html', label: 'Готовая вёрстка' },
];

/**
 * Где справочник начинается с примера, а не с абзаца, или первый абзац — уточнение для знатоков,
 * подпись для карточки задана здесь.
 */
const OVERRIDES: Record<string, { title?: string; text: string }> = {
  content: { text: 'Заголовок, чип рядом с ним, логотип в углу и тело из любых блоков.' },
  cover: { text: 'Логотип, заголовок, подзаголовок и живая графика справа.' },
  space: { title: '«Космический» финальный', text: 'Всегда тёмный: звёзды, метеоры, сияние вокруг логотипа, параллакс за мышью.' },
  finale: { title: 'Финальный', text: 'Кольца, световой луч, слова по одному, QR-код из ссылки и кнопки контактов.' },
  grid: { text: 'Колонки, строки, высота и выравнивание; элемент может занять несколько ячеек.' },
  stack: { text: 'Блоки сверху вниз с заданным отступом.' },
  text: { title: 'Текст, подпись, список, отступ', text: 'Абзац обычного, крупного или мелкого размера, маркированный список, пустое место.' },
  image: { text: 'Файл из assets встраивается в HTML при сборке; кадр, масштаб и стиль рисунка — мышью в студии.' },
  card: { title: 'Карточка', text: 'Заголовок, абзац и любые блоки внутри; заливка — цветом темы или своим.' },
  panel: { text: 'Выделенная панель с ячейками на одну или две колонки.' },
  kv: { text: 'Аккуратная таблица параметров: ключ слева, значение справа.' },
  progress: { text: 'Полоса заполняется, когда открывается слайд.' },
  sliders: { text: 'Параметры с положением ползунка — для рассказа о настройках.' },
  network: { text: 'Станция в центре, устройства по кругу, по линиям бегут импульсы.' },
  tile: { text: 'Иллюстрация с мигающими индикаторами или своё фото с подписью.' },
  'line-chart': { text: 'Линия прорисовывается при открытии слайда, оси подписываются сами.' },
  uptime: { text: 'Ячейка на день, дни ниже порога — бледнее.' },
  bars: { text: 'Столбцы вырастают по очереди, подписи под осью.' },
  stat: { text: 'Крупное число с подписью и изменением — для главной цифры слайда.' },
  quote: { text: 'Цитата с автором и подписью.' },
  timeline: { text: 'Этапы по порядку, линия прорисовывается до последнего пройденного.' },
  orbit: { text: 'Метки на орбитах вокруг центра.' },
  html: { title: 'Фрагмент вёрстки', text: 'Готовая вёрстка, тексты и картинки которой правятся на месте; скрипты из разметки убираются.' },
};

const plain = (s: string) => s
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Каталог для главной из справочника компонентов (content/docs/components.md, кладёт yarn sync:engine):
 * каждый заголовок «### `тип` — название» — карточка, первый абзац под ним — описание.
 * Новые блоки в Slideria появляются на лендинге сами после синхронизации.
 */
export async function readCatalog(): Promise<CatalogItem[]> {
  const md = await fs.readFile(path.join(process.cwd(), 'content', 'docs', 'components.md'), 'utf8');
  const lines = md.split('\n');
  const items: CatalogItem[] = [];
  let group: CatalogGroup | null = null;
  let inCode = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) { inCode = !inCode; continue; }
    if (inCode) continue;
    if (line.startsWith('## ')) { group = GROUPS[line.slice(3).trim()] ?? null; continue; }
    if (!group || !line.startsWith('### ')) continue;
    const heading = line.slice(4).trim();
    const types = [...heading.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]);
    if (!types.length) continue;
    const dash = heading.split(/\s+—\s+/);
    let title = dash.length > 1 ? dash.slice(1).join(' — ') : heading.includes(':') ? heading.split(':')[0] : '';
    title = plain(title) || types.join(', ');
    // «космический» → «Космический»: заглавная после открывающей кавычки
    title = title.replace(/^(«?)(.)/, (_, q: string, c: string) => q + c.toUpperCase());
    // описание — первый абзац текста под заголовком
    let text = '';
    let fence = false;
    for (let j = i + 1; j < lines.length && !lines[j].startsWith('#'); j++) {
      const l = lines[j].trim();
      if (l.startsWith('```')) { fence = !fence; continue; }
      if (fence || !l || l.startsWith('|') || l.startsWith('>')) { if (text) break; continue; }
      text += (text ? ' ' : '') + l.replace(/^[-*]\s+/, '');
    }
    text = plain(text).replace(/:$/, '.');
    if (text.length > 140) text = text.slice(0, text.lastIndexOf(' ', 136)) + '…';
    const o = OVERRIDES[types[0]];
    if (o) { title = o.title ?? title; text = o.text; }
    if (!text) text = 'Поля и пример YAML — в справочнике компонентов.';
    items.push({ types, title, text, group, anchor: types[0] });
  }
  // Сначала самое наглядное: живая графика, данные, раскладка, шаблоны, вёрстка
  const order = catalogGroups.map((g) => g.id);
  return items.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
}
