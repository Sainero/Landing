import engine from '../../../content/engine.json';

const cloudUrl = import.meta.env.PUBLIC_CLOUD_URL?.trim() || null;
const downloadUrl = import.meta.env.PUBLIC_DOWNLOAD_URL?.trim() || null;

/**
 * Настройки сайта. Облако — отдельное приложение: лендинг знает только его адрес.
 * Пока PUBLIC_CLOUD_URL не задан, ссылки «Облако» ведут на раздел #cloud с пометкой «скоро».
 * Пока не задан PUBLIC_DOWNLOAD_URL, кнопка программы ведёт на «Установку» в документации.
 */
export const siteConfig = {
  name: 'Slideria',
  tagline: 'Презентации, которые живут',
  description:
    'Slideria — презентации как данные: студия как PowerPoint, показ с окном докладчика и пультом на телефоне, экспорт в один HTML-файл, PowerPoint и PDF. Программа для компьютера и MCP для ИИ-агентов.',
  cloudUrl,
  downloadUrl,
  engine,
} as const;

export const isCloudLive = cloudUrl !== null;
export const isDownloadLive = downloadUrl !== null;

/** Адрес внутри облака: cloudHref('/login') → https://app…/login. Без облака — раздел #cloud. */
export function cloudHref(path = '/'): string {
  if (!cloudUrl) return '/#cloud';
  return cloudUrl.replace(/\/$/, '') + path;
}

export function deckSize(name: string): number | null {
  return engine.decks.find((d) => d.name === name)?.sizeKb ?? null;
}

/** Размер файла по-русски: 980 КБ, 2,7 МБ */
export function sizeLabel(kb: number | null): string {
  if (kb == null) return '';
  return kb < 1024 ? `${kb} КБ` : `${(kb / 1024).toFixed(1).replace('.', ',')} МБ`;
}
