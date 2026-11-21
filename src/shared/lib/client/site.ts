/**
 * Общее поведение страниц (без фреймворка): тема, появление при прокрутке,
 * шапка при прокрутке, мобильное меню. Подключается один раз в BaseLayout.
 */
import { broadcastTheme } from '@/entities/deck/lib/protocol';
import { THEME_KEY } from '../theme';

const root = document.documentElement;

// --- тема ---
document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('[data-theme-toggle]');
  if (!btn) return;
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem(THEME_KEY, next); } catch { /* приватный режим */ }
  broadcastTheme(next);
});

// --- появление при прокрутке ---
const reveal = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      io.unobserve(en.target);
    }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  reveal.forEach((el) => io.observe(el));
} else {
  reveal.forEach((el) => el.classList.add('in'));
}

// --- шапка: фон после начала прокрутки ---
const header = document.querySelector<HTMLElement>('[data-header]');
const onScroll = () => header?.toggleAttribute('data-scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// --- мобильное меню (нативный <dialog>) ---
const menu = document.querySelector<HTMLDialogElement>('[data-mobile-menu]');
document.querySelectorAll('[data-menu-open]').forEach((b) => b.addEventListener('click', () => menu?.showModal()));
menu?.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t === menu || t.closest('[data-menu-close]') || t.closest('a')) menu.close();
});

// --- секции с бесконечными анимациями за экраном стоят ([data-anim] → [data-paused]) ---
const animated = [...document.querySelectorAll<HTMLElement>('[data-anim]')];
if (animated.length && 'IntersectionObserver' in window) {
  const pause = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.target.toggleAttribute('data-paused', !en.isIntersecting)),
    { rootMargin: '120px 0px' },
  );
  animated.forEach((el) => pause.observe(el));
}

// --- секции ниже первого экрана: при загрузке браузер их пропускает (content-visibility: auto в globals.css),
// а после загрузки, в простое, они дорисовываются по одной за кадр. Загрузка не тратит время на невидимое,
// а к началу прокрутки всё уже готово: секции не дорисовываются прямо во время неё.
// Переход к разделу (якорь в адресе или ссылка) сначала дорисовывает всё: иначе секции выше цели
// вырастут из запасной высоты уже после прокрутки, и раздел съедет ---
const later = [...document.querySelectorAll<HTMLElement>('#main > section:not([data-hero])')];
if (later.length) {
  const show = (section: HTMLElement) => { section.style.contentVisibility = 'visible'; };
  const finish = () => later.splice(0).forEach(show);

  const id = decodeURIComponent(location.hash.slice(1));
  const target = id ? document.getElementById(id) : null;
  if (target) {
    finish();
    requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant' }));
  } else {
    const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 800 }) : setTimeout(fn, 50));
    const warm = () => {
      const section = later.shift();
      if (!section) return;
      show(section);
      requestAnimationFrame(() => idle(warm));
    };
    const start = () => setTimeout(() => idle(warm), 300);
    if (document.readyState === 'complete') start();
    else addEventListener('load', start, { once: true });
  }
  // щелчок по ссылке на раздел раньше, чем всё дорисовалось: дорисовать до прокрутки (фаза перехвата — раньше перехода)
  document.addEventListener('click', (e) => {
    if (later.length && (e.target as Element).closest?.('a[href*="#"]')) finish();
  }, true);
}
