// @ts-check
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

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
  devToolbar: { enabled: false },
});
