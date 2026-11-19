// Каталог блоков на главной собирается из справочника компонентов Slideria
import { describe, expect, it } from 'vitest';
import { catalogGroups, readCatalog } from '@/entities/catalog/readCatalog';

const items = await readCatalog();

describe('readCatalog', () => {
  it('блоков достаточно, у каждого есть название и описание', () => {
    expect(items.length).toBeGreaterThan(40);
    for (const x of items) {
      expect(x.title.length, x.types.join()).toBeGreaterThan(2);
      expect(x.text.length, x.types.join()).toBeGreaterThan(10);
    }
  });

  it('в подписях нет кода: имён полей, скобок и разметки', () => {
    const code = /[`{}[\]<>=]|\([a-z][\w ,;]*\)|\bdeck\.yaml\b|\bYAML\b/;
    for (const x of items) {
      expect(code.test(x.title), `${x.types[0]}: ${x.title}`).toBe(false);
      expect(code.test(x.text), `${x.types[0]}: ${x.text}`).toBe(false);
    }
  });

  it('стили презентации (CSS) — не для пользователей программы', () => {
    expect(items.some((x) => x.types.includes('css'))).toBe(false);
  });

  it('название начинается с заглавной, в том числе после «кавычки»', () => {
    for (const x of items) expect(/^«?[А-ЯЁA-Z0-9]/.test(x.title), x.title).toBe(true);
  });

  it('сначала живая графика, дальше группы по порядку вкладок', () => {
    const order = catalogGroups.map((g) => g.id);
    const seen = items.map((x) => order.indexOf(x.group));
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(items[0].group).toBe('live');
  });
});
