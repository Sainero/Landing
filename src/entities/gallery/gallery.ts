/**
 * Галерея блоков: кадры небольших презентаций в теме витрины Slideria (content/gallery/<имя>/deck.yaml)
 * с блоками, которых нет на витрине. Их собирает движок Slideria и снимает `yarn sync:engine` (scripts/lib/gallery.mjs):
 *   src/assets/gallery/<имя>-<n>-<light|dark>.webp        — крупные, для раздела «Блоки»
 *   public/demo/gallery/thumbs/<имя>-<n>-<light|dark>.webp — маленькие, для полёта и карточек
 * Здесь — что на каком слайде, чтобы разделы сайта брали разные слайды и не повторяли друг друга.
 */
import { siteConfig } from '@/shared/lib/config';

export type GalleryDeck = 'cafe' | 'lesson' | 'strategy' | 'payments';

/** О чём презентация */
export const galleryTopics: Record<GalleryDeck, string> = {
  cafe: 'Открытие кофейни',
  lesson: 'Школьный урок',
  strategy: 'Стратегия компании',
  payments: 'Платёжный сервис',
};

export interface GallerySlide {
  deck: GalleryDeck;
  /** Номер слайда в презентации, с единицы */
  n: number;
  /** Главный блок слайда — подпись на сайте */
  block: string;
  /** Род блока — метка на плитке */
  tag: string;
  text: string;
}

/** Все слайды галереи: первые девять — раздел «Блоки», титулы — карточки «Три способа», все — полёт */
export const gallery: GallerySlide[] = [
  { deck: 'cafe', n: 1, block: 'Диаграмма Ганта', tag: 'Планы', text: 'Задачи по месяцам, готовность заливкой, вехи и линия «сегодня».' },
  { deck: 'lesson', n: 1, block: 'Тест для зала', tag: 'Интерактив', text: 'Докладчик щёлкает ответ зала — верный подсвечивается, баллы считаются сами.' },
  { deck: 'strategy', n: 2, block: 'Матрица решений', tag: 'Решения', text: 'Оценки с весами критериев: итог считается сам, лучший вариант — в рамке.' },
  { deck: 'payments', n: 1, block: 'Схема из текста', tag: 'Схемы', text: 'Пишете «Магазин -> Банк: списание» — схема раскладывается сама.' },
  { deck: 'lesson', n: 3, block: 'Формула и график', tag: 'Интерактив', text: 'Ползунок меняет ускорение — формула, число и кривая пересчитываются при показе.' },
  { deck: 'strategy', n: 1, block: 'Дорожная карта', tag: 'Планы', text: 'Путь с изгибами: вехи появляются по очереди, пройденный участок закрашен.' },
  { deck: 'cafe', n: 2, block: 'Водопад, доли и числа', tag: 'Данные', text: 'Как из прошлого года получился этот, откуда гости и главные цифры.' },
  { deck: 'payments', n: 3, block: 'Айсберг', tag: 'Схемы', text: 'Что видно над водой и что за этим стоит; по воде бегут волны.' },
  { deck: 'lesson', n: 2, block: 'Диаграмма Венна', tag: 'Схемы', text: 'Общее и различия: при появлении круги сходятся.' },
  { deck: 'cafe', n: 3, block: 'Матрица рисков', tag: 'Решения', text: 'Вероятность × последствия: клетки от зелёного к красному, меры рядом.' },
  { deck: 'strategy', n: 3, block: 'TAM · SAM · SOM', tag: 'Данные', text: 'Рынок вложенными кругами, пояснения — справа.' },
  { deck: 'payments', n: 2, block: 'Точечная диаграмма', tag: 'Данные', text: 'Два ряда точек, линия тренда, уравнение и R².' },
  { deck: 'cafe', n: 4, block: 'Титул с орбитами', tag: 'Титул', text: 'Титульный слайд: метки на орбитах вокруг центра.' },
  { deck: 'lesson', n: 4, block: 'Титул с лестницей', tag: 'Титул', text: 'Титульный слайд: ступени растут по очереди.' },
  { deck: 'strategy', n: 4, block: 'Титул с колоннами', tag: 'Титул', text: 'Титульный слайд: крыша опускается на колонны.' },
  { deck: 'payments', n: 4, block: 'Титул с шестерёнками', tag: 'Титул', text: 'Титульный слайд: колёса крутятся в зацеплении.' },
];

/** Девять слайдов раздела «Блоки»: в каждом ряду — три разные презентации */
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
