/**
 * Общее поведение страниц (без фреймворка): тема, копирование, появление при прокрутке,
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

// --- копирование ---
document.addEventListener('click', async (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-copy]');
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy ?? '');
    btn.setAttribute('data-done', '');
    setTimeout(() => btn.removeAttribute('data-done'), 1600);
  } catch { /* нет доступа к буферу обмена */ }
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
