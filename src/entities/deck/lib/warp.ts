/**
 * «Полёт сквозь слайды» — раскладка карточек для SlideWarp.
 *
 * Каждая карточка висит в стороне от оси полёта (ux, uy — направление и удаление в долях базового радиуса)
 * и бесконечно летит из глубины (WARP.far) мимо зрителя (WARP.near). Полёт и прозрачность — CSS-анимации,
 * их ведёт видеокарта; отсюда только числа для стилей. Раскладка детерминированная (сид),
 * поэтому сборка сайта даёт одинаковый HTML.
 */
export const WARP = {
  /** Откуда вылетает карточка и где пропадает, px по оси Z (перспектива сцены — 900 px) */
  far: -4200,
  near: 560,
  /** Доля пути, за которую карточка проявляется и тает — как в @keyframes warp-fade */
  fadeIn: 0.16,
  fadeOut: 0.9,
} as const;

export interface WarpCard {
  /** Направление от оси и удаление (1 — базовый радиус, задаётся в CSS) */
  ux: number;
  uy: number;
  /** Наклон к оси полёта, градусы: карточки как стены туннеля */
  ry: number;
  rx: number;
  /** Секунд на пролёт и отрицательная задержка — где карточка в момент загрузки */
  dur: number;
  delay: number;
  /** Положение и прозрачность без движения (prefers-reduced-motion) */
  z0: number;
  o0: number;
  /** Номер кадра на карточке (с нуля) */
  slide: number;
}

/** Маленький предсказуемый генератор случайных чисел */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Прозрачность на доле пути p (0 — вдали, 1 — у зрителя) */
export function warpOpacity(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  if (p < WARP.fadeIn) return p / WARP.fadeIn;
  if (p > WARP.fadeOut) return (1 - p) / (1 - WARP.fadeOut);
  return 1;
}

const GOLDEN_ANGLE = 2.399963229728653;
const GOLDEN_RATIO = 0.6180339887498949;
/** Шаг по кадрам: взаимно прост с 14, поэтому первые 14 карточек показывают разные слайды */
export const SLIDE_STEP = 5;

const r2 = (n: number) => Math.round(n * 100) / 100 || 0;

/**
 * Раскладка: углы и фазы идут по золотому сечению, поэтому любые первые N карточек
 * (на телефоне показываются не все) ложатся равномерно и по кругу, и по глубине.
 */
export function warpLayout({ count, slides, seed = 1 }: { count: number; slides: number; seed?: number }): WarpCard[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => {
    const a = i * GOLDEN_ANGLE + (rnd() - 0.5) * 0.5;
    const r = 1.15 + rnd() * 1.45;
    const dur = 13 + rnd() * 8;
    const phase = (i * GOLDEN_RATIO + rnd() * 0.08) % 1;
    return {
      ux: r2(Math.cos(a) * r),
      uy: r2(Math.sin(a) * r),
      ry: r2(-Math.cos(a) * (8 + rnd() * 8)),
      rx: r2(Math.sin(a) * (4 + rnd() * 5)),
      dur: r2(dur),
      delay: r2(-phase * dur),
      z0: Math.round(WARP.far + phase * (WARP.near - WARP.far)),
      o0: r2(warpOpacity(phase)),
      slide: slides > 0 ? (i * SLIDE_STEP) % slides : 0,
    };
  });
}
