// Названия и заметки слайдов демо-презентаций: вкладки витрины и оглавление примера
import { describe, expect, it } from 'vitest';
import engine from '../../content/engine.json';
import { readDeck } from '@/entities/deck/lib/readDeck';

describe('readDeck', () => {
  it.each(engine.decks.map((d) => [d.name, d.slides] as const))('%s: столько же слайдов, сколько в сборке', async (name, slides) => {
    const deck = await readDeck(name);
    expect(deck.slides).toHaveLength(slides);
    expect(deck.title.length).toBeGreaterThan(3);
  });

  it('у каждого слайда есть название и шаблон', async () => {
    for (const name of engine.decks.map((d) => d.name)) {
      for (const s of (await readDeck(name)).slides) {
        expect(s.label.trim().length, `${name}: ${s.id}`).toBeGreaterThan(0);
        expect(s.template.length).toBeGreaterThan(0);
      }
    }
  });

  it('заметки докладчика берутся для оглавления примера', async () => {
    const deck = await readDeck('microclimate');
    expect(deck.slides.filter((s) => s.notes).length).toBeGreaterThan(3);
  });
});
