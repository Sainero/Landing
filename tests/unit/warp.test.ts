// Полёт сквозь слайды: раскладка карточек — одинаковая при каждой сборке и равномерная на любом экране
import { describe, expect, it } from 'vitest';
import { WARP, mulberry32, slideStep, warpLayout, warpOpacity } from '@/entities/deck/lib/warp';

describe('warpLayout', () => {
  const cards = warpLayout({ count: 22, slides: 14, seed: 7 });

  it('одинаковая при одинаковом сиде, другая при другом', () => {
    expect(warpLayout({ count: 22, slides: 14, seed: 7 })).toEqual(cards);
    expect(warpLayout({ count: 18, slides: 14, seed: 8 })).not.toEqual(cards);
  });

  it('карточки в стороне от оси: заголовок не закрыт', () => {
    for (const c of cards) {
      const r = Math.hypot(c.ux, c.uy);
      expect(r).toBeGreaterThanOrEqual(1.14);
      expect(r).toBeLessThanOrEqual(2.61);
    }
  });

  it('задержка отрицательная и меньше пролёта: сцена заполнена с первой секунды', () => {
    for (const c of cards) {
      expect(c.dur).toBeGreaterThanOrEqual(13);
      expect(c.dur).toBeLessThanOrEqual(21);
      expect(c.delay).toBeLessThanOrEqual(0);
      expect(-c.delay).toBeLessThan(c.dur);
    }
  });

  it('без движения карточка стоит там же, где была бы в полёте', () => {
    for (const c of cards) {
      const p = -c.delay / c.dur;
      expect(c.z0).toBeGreaterThanOrEqual(WARP.far);
      expect(c.z0).toBeLessThanOrEqual(WARP.near);
      expect(Math.abs(c.z0 - (WARP.far + p * (WARP.near - WARP.far)))).toBeLessThan(5);
      expect(Math.abs(c.o0 - warpOpacity(p))).toBeLessThan(0.02);
    }
  });

  it('первые карточки показывают разные слайды', () => {
    const first = cards.slice(0, 14).map((c) => c.slide);
    expect(new Set(first).size).toBe(14);
    expect(first.every((s) => s >= 0 && s < 14)).toBe(true);
  });

  it('на телефоне видны первые 10: они во всех четвертях и на разной глубине', () => {
    const phone = cards.slice(0, 10);
    const quarters = new Set(phone.map((c) => `${c.ux >= 0}${c.uy >= 0}`));
    expect(quarters.size).toBe(4);
    const depth = phone.map((c) => -c.delay / c.dur).sort((a, b) => a - b);
    // нет «дыры» больше трети пути: карточки не летят пачкой
    for (let i = 1; i < depth.length; i++) expect(depth[i] - depth[i - 1]).toBeLessThan(0.34);
  });

  it('карточки наклонены к оси, как стены туннеля', () => {
    for (const c of cards) {
      if (Math.abs(c.ux) > 0.2) expect(Math.sign(c.ry)).toBe(-Math.sign(c.ux));
      if (Math.abs(c.uy) > 0.2) expect(Math.sign(c.rx)).toBe(Math.sign(c.uy));
    }
  });

  it('при 30 кадрах (витрина и галерея) 22 карточки показывают 22 разных', () => {
    const many = warpLayout({ count: 22, slides: 30, seed: 7 }).map((c) => c.slide);
    expect(new Set(many).size).toBe(22);
    expect(slideStep(30)).toBe(7);
    expect(slideStep(14)).toBe(5);
  });

  it('без кадров — нулевой слайд, без ошибок', () => {
    expect(warpLayout({ count: 3, slides: 0 }).map((c) => c.slide)).toEqual([0, 0, 0]);
  });
});

describe('warpOpacity', () => {
  it('проявляется вдали, держится, тает у зрителя', () => {
    expect(warpOpacity(0)).toBe(0);
    expect(warpOpacity(WARP.fadeIn / 2)).toBeCloseTo(0.5);
    expect(warpOpacity(0.5)).toBe(1);
    expect(warpOpacity((1 + WARP.fadeOut) / 2)).toBeCloseTo(0.5);
    expect(warpOpacity(1)).toBe(0);
  });
});

describe('mulberry32', () => {
  it('числа от 0 до 1, последовательность повторяется', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
