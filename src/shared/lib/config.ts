import engine from '../../../content/engine.json';

const cloudUrl = import.meta.env.PUBLIC_CLOUD_URL?.trim() || null;

/**
 * Настройки сайта. Облако — отдельное приложение: лендинг знает только его адрес.
 * Пока PUBLIC_CLOUD_URL не задан, ссылки «Облако» ведут на раздел #cloud с пометкой «скоро».
 */
export const siteConfig = {
  name: 'HTMLPPTX',
  tagline: 'Презентации как данные',
  description:
    'Движок HTML-презентаций: слайды в YAML, внешний вид в компонентах, на выходе один HTML-файл. Работает без интернета, с темами, анимациями и режимом докладчика.',
  cloudUrl,
  github: 'https://github.com/kotomoran070-source/HTMLPPTX',
  license: 'MIT',
  engine,
} as const;

export const isCloudLive = cloudUrl !== null;

/** Адрес внутри облака: cloudHref('/login') → https://app…/login. Без облака — раздел #cloud. */
export function cloudHref(path = '/'): string {
  if (!cloudUrl) return '/#cloud';
  return cloudUrl.replace(/\/$/, '') + path;
}

export function deckSize(name: string): number | null {
  return engine.decks.find((d) => d.name === name)?.sizeKb ?? null;
}
