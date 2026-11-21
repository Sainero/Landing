// Галерея блоков: у каждого слайда есть кадры в обеих темах, разделы сайта берут разные слайды
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { blockSlides, gallery, galleryTopics, warpThumbs } from '@/entities/gallery/gallery';

const root = process.cwd();
const slidesIn = (deck: string) => YAML.parse(fs.readFileSync(path.join(root, 'content', 'gallery', deck, 'deck.yaml'), 'utf8')).slides.length as number;

describe('галерея блоков', () => {
  it('каждый слайд есть в презентации и снят в обеих темах — крупно и маленьким кадром', () => {
    for (const g of gallery) {
      expect(g.n).toBeLessThanOrEqual(slidesIn(g.deck));
      for (const look of ['light', 'dark']) {
        expect(fs.existsSync(path.join(root, 'src', 'assets', 'gallery', `${g.deck}-${g.n}-${look}.webp`)), `${g.deck}-${g.n}-${look}`).toBe(true);
        expect(fs.existsSync(path.join(root, 'public', 'demo', 'gallery', 'thumbs', `${g.deck}-${g.n}-${look}.webp`))).toBe(true);
      }
    }
  });

  it('все слайды всех презентаций галереи подписаны', () => {
    for (const deck of Object.keys(galleryTopics)) {
      expect(gallery.filter((g) => g.deck === deck).length).toBe(slidesIn(deck));
    }
  });

  it('в разделе «Блоки» девять разных слайдов, в каждом ряду три разные презентации', () => {
    expect(blockSlides).toHaveLength(9);
    expect(new Set(blockSlides.map((b) => `${b.deck}/${b.n}`)).size).toBe(9);
    for (let r = 0; r < 3; r++) {
      expect(new Set(blockSlides.slice(r * 3, r * 3 + 3).map((b) => b.deck)).size).toBe(3);
    }
  });

  it('полёт: витрина и вся галерея, без повторов, витрина и галерея чередуются', () => {
    const pool = warpThumbs();
    expect(new Set(pool).size).toBe(pool.length);
    expect(pool.filter((t) => t.includes('/gallery/')).length).toBe(gallery.length);
    expect(pool[0]).toContain('/posters/');
    expect(pool[1]).toContain('/gallery/');
    expect(pool.every((t) => t.includes('{look}'))).toBe(true);
  });
});
