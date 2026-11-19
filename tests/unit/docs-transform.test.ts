// Документация для пользователей: из README и docs/ Slideria уходят ручки к коду, остаётся работа в программе
import { describe, expect, it } from 'vitest';
import { cleanText, dropDeadAnchors, fixLinks, forUsers, isDev, keepSections, section, slug } from '../../scripts/lib/docs-transform.mjs';

describe('isDev: что считается ручкой к коду', () => {
  it.each([
    'Запустите `yarn dev`',
    'npx playwright install chromium',
    'код — в `src/engine/show.ts`',
    'настройки в `claude_desktop_config.json`',
    'поле `template: canvas`',
    'тексты вынесены в поля `texts` и `images`',
    'картинки кладутся в `assets/`',
    'если файл поддерживает `data-theme`, переменные `var(--ac)`',
    'правки идут прямо в deck.yaml',
    'адрес `?deck=имя&studio`',
    'флаг --clean',
    'переменная SLIDERIA_DECKS',
    'подробности — в [справочнике](docs/COMPONENTS.md)',
  ])('ручка: %s', (text) => expect(isDev(text)).toBe(true));

  it.each([
    'Перетащите файл `.pptx` на страницу',
    'Перейти к слайду, например `5` Enter',
    'Пишутся просто — `x^2`, `(a+b)/c` — или на LaTeX',
    '«Файл» → «Экспорт» → PDF',
    'Ctrl+Z / Ctrl+Shift+Z, до 200 шагов',
    'Сайт: [Slideria](https://slideria.example)',
  ])('не ручка: %s', (text) => expect(isDev(text)).toBe(false));
});

describe('cleanText', () => {
  it('убирает предложение с ручкой, остальное оставляет', () => {
    expect(cleanText('Тема меняется одним щелчком. Файлы тем лежат в `library/themes/`. Шрифты копируются в презентацию.'))
      .toBe('Тема меняется одним щелчком. Шрифты копируются в презентацию.');
  });
  it('убирает скобки с ручкой', () => {
    expect(cleanText('Окно импорта (или `yarn import-pptx файл.pptx`) покажет отчёт.')).toBe('Окно импорта покажет отчёт.');
  });
  it('убирает часть через «;» и ставит точку', () => {
    expect(cleanText('Экспорт в PDF; в терминале — `yarn build имя`')).toBe('Экспорт в PDF.');
  });
  it('если ручка в первом, главном предложении — пусто', () => {
    expect(cleanText('Сохранить в `presentations/.checkpoints`. Ctrl+Z на точке останавливается.')).toBe('');
  });
});

describe('forUsers', () => {
  it('убирает блоки кода', () => {
    expect(forUsers('Текст.\n\n```bash\nyarn dev\n```\n\nЕщё текст.')).toBe('Текст.\n\nЕщё текст.');
  });

  it('оставляет заголовок, после которого пустая строка и текст', () => {
    expect(forUsers('## Показ\n\nКлавиша P — окно докладчика.')).toBe('## Показ\n\nКлавиша P — окно докладчика.');
  });

  it('убирает раздел, от которого ничего не осталось', () => {
    expect(forUsers('## Показ\n\nТекст.\n\n## Сборка\n\n`yarn build`\n\n## Экспорт\n\nPDF.')).toBe('## Показ\n\nТекст.\n\n## Экспорт\n\nPDF.');
  });

  it('убирает пустой раздел в конце', () => {
    expect(forUsers('## Показ\n\nТекст.\n\n## Тесты\n\n```\nyarn test\n```\n')).toBe('## Показ\n\nТекст.');
  });

  it('строка таблицы с ручкой в описании уходит, остальные остаются', () => {
    const md = '| Что | Как |\n|---|---|\n| Текст | Щелчок по тексту |\n| Код | Вкладка с `deck.yaml` |';
    expect(forUsers(md)).toBe('| Что | Как |\n|---|---|\n| Текст | Щелчок по тексту |');
  });

  it('таблица без строк уходит вместе с шапкой', () => {
    expect(forUsers('До.\n\n| Команда | Что |\n|---|---|\n| `yarn dev` | сервер |\n\nПосле.')).toBe('До.\n\nПосле.');
  });

  it('в итоге ни одной строки с ручкой', () => {
    const md = 'Вступление.\n\n- `yarn present имя` — показ\n- Пульт: клавиша R\n\n| Клавиша | Действие |\n|---|---|\n| R | Пульт |';
    const out = forUsers(md);
    expect(out.split('\n').filter((l) => isDev(l))).toEqual([]);
    expect(out).toContain('Пульт: клавиша R');
  });
});

describe('ссылки', () => {
  it('GitHub и файлы репозитория — текстом, документы со страницей — адресом сайта', () => {
    const md = '[код](https://github.com/x/y) и [MCP](docs/MCP.md#подключить) и [план](docs/PLAN.md) и [сайт](https://slideria.example)';
    expect(fixLinks(md, { 'MCP.md': '/docs/mcp' })).toBe('код и [MCP](/docs/mcp#подключить) и план и [сайт](https://slideria.example)');
  });

  it('картинки из репозитория убираются', () => {
    expect(fixLinks('<img src="docs/brand/slideria.svg" width="64">\n# Slideria')).toBe('# Slideria');
  });

  it('ссылка на убранный раздел страницы — текстом', () => {
    const md = '## Сервисы\n\nСм. [сервисы](#сервисы) и [устройство](#как-устроено).';
    expect(dropDeadAnchors(md)).toBe('## Сервисы\n\nСм. [сервисы](#сервисы) и устройство.');
  });

  it('якорь заголовка — как у Astro', () => {
    expect(slug('Правки из присланного файла')).toBe('правки-из-присланного-файла');
    expect(slug('«Файл» → «Экспорт»')).toBe('файл--экспорт');
  });
});

describe('разделы', () => {
  const md = '# Заголовок\n\nВступление.\n\n## Показ\n\nP — докладчик.\n\n### Пульт\n\nR — QR.\n\n## Сборка\n\nyarn build';
  it('section — тело раздела нужного уровня', () => {
    expect(section(md, 'Показ')).toBe('P — докладчик.\n\n### Пульт\n\nR — QR.');
    expect(section(md, 'Пульт', 3)).toBe('R — QR.');
    expect(section(md, 'Нет такого')).toBe('');
  });
  it('keepSections — вступление и выбранные разделы', () => {
    expect(keepSections(md, ['Показ'])).toBe('# Заголовок\n\nВступление.\n\n## Показ\n\nP — докладчик.\n\n### Пульт\n\nR — QR.');
  });
});
