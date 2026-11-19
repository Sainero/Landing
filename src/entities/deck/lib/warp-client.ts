/**
 * Полёт сквозь слайды в браузере: кадры, смена кадров, тема, наклон за курсором.
 *
 * Сам полёт — CSS-анимации (их ведёт видеокарта, основной поток свободен). Здесь только:
 *  - кадры грузятся после загрузки страницы, в простое: не спорят со шрифтами и витриной;
 *  - на первом экране кадр рисуется в <canvas>, а не в <img>: декоративные карточки не становятся
 *    «самым крупным элементом» (LCP) — им остаётся заголовок; ниже первого экрана карточки — <img>;
 *  - холсты рисуются по одному за кадр и размером с карточку: без видеокарты передача холста
 *    на экран идёт через основной поток, пачка холстов разом — заметная заминка;
 *  - у карточки один кадр на всё время: перерисовка на каждом круге стоила бы того же;
 *  - смена темы сайта перерисовывает кадры в другой теме;
 *  - на компьютере сцена слегка поворачивается за курсором (переход transform, тоже видеокарта).
 */
import { siteLook, thumbUrl } from './live';

type Look = 'light' | 'dark';
type Source = ImageBitmap | HTMLImageElement;

const cache = new Map<string, Promise<Source | null>>();

function load(url: string): Promise<Source | null> {
  let p = cache.get(url);
  if (!p) {
    p = 'createImageBitmap' in window
      ? fetch(url).then((r) => (r.ok ? r.blob() : Promise.reject(r.status))).then((b) => createImageBitmap(b))
      : new Promise<HTMLImageElement>((ok, fail) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = fail;
        img.src = url;
      });
    p = p.catch(() => null);
    cache.set(url, p);
  }
  return p;
}

const visible = (el: Element) => el.getClientRects().length > 0;

/** Очередь отрисовки: один холст за кадр анимации */
const queue: (() => Promise<void>)[] = [];
let draining = false;
function enqueue(job: () => Promise<void>): void {
  queue.push(job);
  if (draining) return;
  draining = true;
  const next = () => {
    const job = queue.shift();
    if (!job) { draining = false; return; }
    void job().finally(() => requestAnimationFrame(next));
  };
  requestAnimationFrame(next);
}

function mount(root: HTMLElement): void {
  const deck = root.dataset.warp!;
  const cards = [...root.querySelectorAll<HTMLCanvasElement | HTMLImageElement>('[data-slide]')];
  let look: Look = siteLook();

  async function paint(card: HTMLCanvasElement | HTMLImageElement): Promise<void> {
    const key = `${look}:${card.dataset.slide}`;
    card.dataset.want = key;
    const url = thumbUrl(deck, Number(card.dataset.slide), look);
    if (card instanceof HTMLImageElement) {
      card.src = url;
      await card.decode().catch(() => undefined);
      if (card.dataset.want === key) card.dataset.painted = key;
      return;
    }
    const canvas = card;
    const src = await load(url);
    // пока грузилось, карточке могли назначить другой кадр или тему
    if (!src || canvas.dataset.want !== key) return;
    // холст — размером с карточку на экране (с запасом на чёткость), но не больше кадра
    const w = Math.min(640, Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2) * 1.1)) || 640;
    if (canvas.width !== w) { canvas.width = w; canvas.height = Math.round((w * 9) / 16); }
    canvas.getContext('2d', { alpha: false })?.drawImage(src, 0, 0, canvas.width, canvas.height);
    canvas.dataset.painted = key;
  }
  // Рисуются только видимые карточки: на телефоне часть скрыта, им не нужна память
  const paintVisible = () => new Promise<void>((done) => {
    const todo = cards.filter((c) => visible(c) && c.dataset.painted !== `${look}:${c.dataset.slide}`);
    if (!todo.length) return done();
    let left = todo.length;
    todo.forEach((c) => enqueue(() => paint(c).finally(() => { if (--left === 0) done(); })));
  });

  const start = () => paintVisible().then(() => root.setAttribute('data-ready', ''));
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 400));
  if (document.readyState === 'complete') idle(start);
  else addEventListener('load', () => idle(start), { once: true });

  // Тема сайта и ширина экрана (на телефоне видно меньше карточек)
  new MutationObserver(() => {
    const next = siteLook();
    if (next === look) return;
    look = next;
    void paintVisible();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(max-width: 767px)').addEventListener('change', () => void paintVisible());

  // Наклон за курсором: только мышь и только если движение не просили убрать
  const tilt = root.querySelector<HTMLElement>('[data-warp-tilt]');
  const host = root.closest<HTMLElement>('section') ?? root.parentElement;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!tilt || !host || !fine || calm) return;
  let frame = 0, x = 0, y = 0;
  host.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      tilt.style.transform = `rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
    });
  }, { passive: true });
  host.addEventListener('pointerleave', () => { tilt.style.transform = ''; });
}

export function mountWarps(): void {
  document.querySelectorAll<HTMLElement>('[data-warp]').forEach(mount);
}
