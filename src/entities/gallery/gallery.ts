/**
 * Галерея блоков: кадры небольших презентаций в разных готовых темах студии (content/gallery/<тема>/deck.yaml).
 * Их собирает движок Slideria и снимает `yarn sync:engine` (scripts/lib/gallery.mjs):
 *   src/assets/gallery/<тема>-<n>-<light|dark>.webp        — крупные, для раздела «Блоки»
 *   public/demo/gallery/thumbs/<тема>-<n>-<light|dark>.webp — маленькие, для полёта и карточек
 * Здесь — что на каком слайде, чтобы разделы сайта брали разные слайды и не повторяли друг друга.
 */
import { siteConfig } from '@/shared/lib/config';

export type GalleryDeck = 'sand' | 'mint' | 'editorial' | 'graphite';

/** Названия тем — как в студии («Дизайн» → темы) */
export const galleryThemes: Record<GalleryDeck, string> = {
  sand: 'Песок',
  mint: 'Мята',
  editorial: 'Редакция',
  graphite: 'Графит',
};

/** Акцент темы — точка у её названия на сайте */
export const galleryAccents: Record<GalleryDeck, string> = {
  sand: '#C2410C',
  mint: '#0D9488',
  editorial: '#B4232C',
  graphite: '#E11D48',
};

export interface GallerySlide {
  deck: GalleryDeck;
  /** Номер слайда в презентации, с единицы */
  n: number;
  /** Главный блок слайда — подпись на сайте */
  block: string;
  text: string;
}

/** Все слайды галереи: первые девять — раздел «Блоки», титулы — карточки «Три способа», все — полёт */
export const gallery: GallerySlide[] = [
  { deck: 'sand', n: 1, block: 'Диаграмма Ганта', text: 'Задачи по месяцам, готовность заливкой, вехи и линия «сегодня».' },
  { deck: 'mint', n: 1, block: 'Тест для зала', text: 'Докладчик щёлкает ответ зала — верный подсвечивается, баллы считаются сами.' },
  { deck: 'editorial', n: 2, block: 'Матрица решений', text: 'Оценки с весами критериев: итог считается сам, лучший вариант — в рамке.' },
  { deck: 'graphite', n: 1, block: 'Схема из текста', text: 'Пишете «Магазин -> Банк: списание» — схема раскладывается сама.' },
  { deck: 'mint', n: 3, block: 'Формула и график', text: 'Ползунок меняет ускорение — формула, число и кривая пересчитываются при показе.' },
  { deck: 'editorial', n: 1, block: '«Рыбья кость»', text: 'Причины проблемы по категориям — диаграмма Исикавы.' },
  { deck: 'sand', n: 2, block: 'Водопад, доли и числа', text: 'Как из прошлого года получился этот, откуда гости и главные цифры.' },
  { deck: 'graphite', n: 3, block: 'Айсберг', text: 'Что видно над водой и что за этим стоит; по воде бегут волны.' },
  { deck: 'mint', n: 2, block: 'Диаграмма Венна', text: 'Общее и различия: при появлении круги сходятся.' },
  { deck: 'sand', n: 3, block: 'Матрица рисков', text: 'Вероятность × последствия: клетки от зелёного к красному, меры рядом.' },
  { deck: 'editorial', n: 3, block: 'TAM · SAM · SOM', text: 'Рынок вложенными кругами, пояснения — справа.' },
  { deck: 'graphite', n: 2, block: 'Точечная диаграмма', text: 'Два ряда точек, линия тренда, уравнение и R².' },
  { deck: 'sand', n: 4, block: 'Титул с орбитами', text: 'Титульный слайд: метки на орбитах вокруг центра.' },
  { deck: 'mint', n: 4, block: 'Титул с лестницей', text: 'Титульный слайд: ступени растут по очереди.' },
  { deck: 'editorial', n: 4, block: 'Титул с колоннами', text: 'Титульный слайд: крыша опускается на колонны.' },
  { deck: 'graphite', n: 4, block: 'Титул с шестерёнками', text: 'Титульный слайд: колёса крутятся в зацеплении.' },
];

/** Девять слайдов раздела «Блоки»: в каждом ряду — три разные темы */
export const blockSlides = gallery.slice(0, 9);

export const gallerySlide = (deck: GalleryDeck, n: number): GallerySlide => {
  const s = gallery.find((g) => g.deck === deck && g.n === n);
  if (!s) throw new Error(`Нет слайда галереи ${deck}/${n}`);
  return s;
};

/** Маленький кадр: адрес с {look} вместо light или dark — подставляет тот, кто показывает */
export const galleryThumb = (deck: GalleryDeck, n: number): string => `/demo/gallery/thumbs/${deck}-${n}-{look}.webp`;

/** Маленький кадр слайда витрины, тот же вид адреса */
export const showcaseThumb = (n: number, deck = 'slideria'): string => `/demo/posters/${deck}/thumbs/{look}-${n}.webp`;

/** Кадры для полёта слайдов: витрина и галерея через один — сцена разноцветная и почти без повторов */
export function warpThumbs(deck = 'slideria'): string[] {
  const count = siteConfig.engine.decks.find((d) => d.name === deck)?.slides ?? 0;
  const a = Array.from({ length: count }, (_, i) => showcaseThumb(i + 1, deck));
  const b = gallery.map((g) => galleryThumb(g.deck, g.n));
  const out: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}
