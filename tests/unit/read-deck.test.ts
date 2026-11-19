// YAML слайдов для первого экрана: ровно тот текст, из которого собран слайд
import { describe, expect, it } from 'vitest';
import engine from '../../content/engine.json';
import { readDeck } from '@/entities/deck/lib/readDeck';

describe('readDeck', () => {
  it.each(engine.decks.map((d) => [d.name, d.slides] as const))('%s: столько же слайдов, сколько в сборке', async (name, slides) => {
    const deck = await readDeck(name);
    expect(deck.slides).toHaveLength(slides);
  });

  it('каждый слайд — отдельный элемент списка без лишнего отступа', async () => {
    const deck = await readDeck('slideria');
    for (const s of deck.slides) {
      expect(s.yaml.startsWith('- '), s.label).toBe(true);
      expect(s.yaml.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(1);
      expect(s.label.length).toBeGreaterThan(0);
    }
    expect(deck.slides[0].yaml).toContain('id: hero');
  });

  it('комментарии в YAML сохраняются', async () => {
    const deck = await readDeck('microclimate');
    const raw = deck.slides.map((s) => s.yaml).join('\n');
    expect(deck.slides.reduce((n, s) => n + s.lines, 0)).toBeGreaterThan(100);
    expect(raw).toMatch(/\n\s*title:/);
  });
});
