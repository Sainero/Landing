import fs from 'node:fs/promises';
import path from 'node:path';
import { isSeq, parseDocument } from 'yaml';

export interface DeckSlideInfo {
  id?: string;
  /** Название слайда: label, title или «Слайд N» */
  label: string;
  template: string;
  /** Заметки докладчика */
  notes?: string;
}

export interface DeckInfo {
  name: string;
  title: string;
  slides: DeckSlideInfo[];
}

/**
 * Названия и заметки слайдов демо-презентации из content/decks/<имя>/deck.yaml (кладёт yarn sync:engine):
 * для вкладок витрины и оглавления примера. Сам YAML на сайте не показывается.
 */
export async function readDeck(name: string): Promise<DeckInfo> {
  const file = path.join(process.cwd(), 'content', 'decks', name, 'deck.yaml');
  const doc = parseDocument(await fs.readFile(file, 'utf8'));
  const seq = doc.get('slides', true);
  if (!isSeq(seq)) throw new Error(`${file}: нет списка slides`);
  const slides = (seq.toJSON() as Record<string, unknown>[]).map((data, i) => ({
    id: typeof data.id === 'string' ? data.id : undefined,
    label: String(data.label ?? data.title ?? `Слайд ${i + 1}`),
    template: String(data.template ?? 'content'),
    notes: typeof data.notes === 'string' ? data.notes.trim() : undefined,
  }));
  return { name, title: String(doc.get('title') ?? name), slides };
}
