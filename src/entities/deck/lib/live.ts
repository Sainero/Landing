/**
 * Живая презентация по требованию. Собранный файл Slideria весит мегабайты и крутит анимации
 * в том же потоке, что и страница (фрейм с того же сайта), поэтому до щелчка «Запустить показ»
 * вместо него — кадр, а фрейм создаётся только по просьбе.
 */
import { send } from './protocol';

export function createDeckFrame(deck: string, index: number, title: string, onReady: (frame: HTMLIFrameElement) => void): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.dataset.deck = deck;
  frame.src = `/demo/${deck}.html#${index + 1}`;
  frame.title = title;
  frame.allow = 'fullscreen';
  frame.className = 'absolute inset-0 z-10 h-full w-full border-0 bg-alt opacity-0 transition-opacity duration-300';
  frame.addEventListener('load', () => {
    send(frame.contentWindow, deck, { type: 'hello' });
    // кадр уходит, когда первый слайд показа уже нарисован
    window.setTimeout(() => {
      frame.classList.remove('opacity-0');
      onReady(frame);
    }, 350);
  }, { once: true });
  return frame;
}

/** Кадр слайда: светлый или тёмный — по теме сайта */
export function posterUrl(deck: string, index: number, look: 'light' | 'dark'): string {
  return `/demo/posters/${deck}/${look}-${index + 1}.webp`;
}

/** Уменьшенный кадр 640 × 360 — для полёта слайдов (SlideWarp) */
export function thumbUrl(deck: string, index: number, look: 'light' | 'dark'): string {
  return `/demo/posters/${deck}/thumbs/${look}-${index + 1}.webp`;
}

export function siteLook(): 'light' | 'dark' {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}
