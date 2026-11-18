import fs from 'node:fs/promises';
import path from 'node:path';
import { isMap, isSeq, parseDocument } from 'yaml';

export interface DeckSlideSource {
  id?: string;
  label: string;
  template: string;
  /** Исходный YAML слайда, как он написан в deck.yaml (с комментариями) */
  yaml: string;
  lines: number;
  /** Заметки докладчика */
  notes?: string;
}

export interface DeckSource {
  name: string;
  title: string;
  slides: DeckSlideSource[];
}

/**
 * Читает content/decks/<имя>/deck.yaml (кладёт yarn sync:engine) и режет его на слайды,
 * сохраняя исходный текст: на лендинге показывается ровно тот YAML, из которого собран слайд.
 */
export async function readDeck(name: string): Promise<DeckSource> {
  const file = path.join(process.cwd(), 'content', 'decks', name, 'deck.yaml');
  const src = await fs.readFile(file, 'utf8');
  const doc = parseDocument(src);
  const seq = doc.get('slides', true);
  if (!isSeq(seq)) throw new Error(`${file}: нет списка slides`);

  const slides = seq.items.map((item, i) => {
    if (!isMap(item) || !item.range) throw new Error(`${file}: слайд ${i + 1} — не объект`);
    const lineStart = src.lastIndexOf('\n', item.range[0] - 1) + 1;
    const raw = src.slice(lineStart, item.range[1]).replace(/\s+$/, '');
    const rows = raw.split('\n');
    const indent = rows[0].match(/^\s*/)![0].length;
    const yaml = rows.map((r) => r.slice(Math.min(indent, r.match(/^\s*/)![0].length))).join('\n');
    const data = item.toJSON() as Record<string, unknown>;
    return {
      id: data.id as string | undefined,
      label: String(data.label ?? data.title ?? `Слайд ${i + 1}`),
      template: String(data.template ?? 'content'),
      yaml,
      lines: rows.length,
      notes: typeof data.notes === 'string' ? data.notes.trim() : undefined,
    };
  });
  return { name, title: String(doc.get('title') ?? name), slides };
}
