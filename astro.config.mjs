// @ts-check
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';

/**
 * Якоря для справочника компонентов: заголовок «### `grid` — сетка» получает id="grid",
 * «### Диаграммы: `donut`, …» — id="donut": каталог на главной ссылается на /docs/components#<блок>.
 */
function rehypeComponentAnchors() {
  /** @param {any} tree */
  return (tree) => {
    /** @param {any} node */
    const walk = (node) => {
      if (node.type === 'element' && /^h[2-4]$/.test(node.tagName)) {
        const code = node.children?.find((/** @type {any} */ c) => c.type === 'element' && c.tagName === 'code');
        if (code) {
          const text = code.children?.map((/** @type {any} */ c) => c.value ?? '').join('');
          if (text && /^[a-z0-9-]+$/.test(text)) node.properties.id = text;
        }
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

const CYRILLIC = ['U+0301', 'U+0400-045F', 'U+0490-0491', 'U+04B0-04B1', 'U+2116'];
const LATIN = ['U+0000-00FF', 'U+0131', 'U+0152-0153', 'U+02BB-02BC', 'U+02C6', 'U+02DA', 'U+02DC', 'U+0304', 'U+0308', 'U+0329', 'U+2000-206F', 'U+20AC', 'U+2122', 'U+2191', 'U+2193', 'U+2212', 'U+2215', 'U+FEFF', 'U+FFFD'];
// Стрелки и знаки (→, ✓, ✦): у Onest это отдельный файл, грузится, только если такой знак есть на странице
const SYMBOLS = ['U+2190', 'U+2192', 'U+2194-2199', 'U+2713', 'U+2726'];

/**
 * Шрифт из пакета @fontsource-variable: кириллица и латиница отдельными файлами, как в пакете
 * @param {string} pkg
 * @param {string} weight
 * @param {string[]} [extra]
 */
function fontsource(pkg, weight, extra = []) {
  /** @param {string} subset @param {string[]} range */
  const variant = (subset, range) => ({
    src: /** @type {[string]} */ ([`./node_modules/@fontsource-variable/${pkg}/files/${pkg}-${subset}-wght-normal.woff2`]),
    weight,
    style: /** @type {const} */ ('normal'),
    unicodeRange: /** @type {[string, ...string[]]} */ (range),
    display: /** @type {const} */ ('swap'),
  });
  return { variants: /** @type {[ReturnType<typeof variant>, ...ReturnType<typeof variant>[]]} */ ([
    variant('cyrillic', CYRILLIC),
    variant('latin', LATIN),
    ...extra.map((subset) => variant(subset, SYMBOLS)),
  ]) };
}

export default defineConfig({
  // Публичный адрес лендинга (sitemap, canonical, Open Graph)
  site: process.env.SITE_URL || 'https://slideria.example',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: 'light',
    },
    processor: unified({ rehypePlugins: [rehypeComponentAnchors] }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
  // Шрифты программы: файлы из пакетов, предзагрузка и подогнанный запасной шрифт — текст не прыгает при подгрузке
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Onest',
      cssVariable: '--font-onest',
      fallbacks: ['system-ui', 'sans-serif'],
      options: fontsource('onest', '100 900', ['symbols']),
    },
    {
      provider: fontProviders.local(),
      name: 'Unbounded',
      cssVariable: '--font-unbounded',
      fallbacks: ['sans-serif'],
      options: fontsource('unbounded', '200 900'),
    },
  ],
  build: {
    // Стили — прямо в HTML: на первый показ не нужен отдельный запрос
    inlineStylesheets: 'always',
  },
  devToolbar: { enabled: false },
});
