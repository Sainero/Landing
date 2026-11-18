/**
 * Связь с собранной презентацией во фрейме. Это тот же протокол, которым движок
 * синхронизирует окно показа и окно докладчика (HTMLPPTX src/engine/sync.ts):
 * конверт { ns: 'htmlpptx', deck, id, msg }.
 */
export type DeckMsg =
  | { type: 'state'; index: number; theme: 'light' | 'dark'; black: boolean }
  | { type: 'goto'; index: number }
  | { type: 'theme'; theme: 'light' | 'dark' }
  | { type: 'hello' };

export interface Envelope { ns: 'htmlpptx'; deck: string; id: string; msg: DeckMsg }

const me = 'site-' + Math.random().toString(36).slice(2);
let counter = 0;

export function send(win: Window | null | undefined, deck: string, msg: DeckMsg): void {
  if (!win) return;
  const env: Envelope = { ns: 'htmlpptx', deck, id: `${me}:${++counter}`, msg };
  win.postMessage(env, '*');
}

export function readEnvelope(data: unknown, deck: string): DeckMsg | null {
  const env = data as Envelope;
  if (!env || env.ns !== 'htmlpptx' || env.deck !== deck || !env.msg) return null;
  return env.msg;
}

/** Все презентации на странице получают новую тему сайта */
export function broadcastTheme(theme: 'light' | 'dark'): void {
  document.querySelectorAll<HTMLIFrameElement>('iframe[data-deck]').forEach((f) => {
    send(f.contentWindow, f.dataset.deck!, { type: 'theme', theme });
  });
}
