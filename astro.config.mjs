// @ts-check
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

/**
 * Якоря для справочника компонентов: заголовок «### `grid` — сетка» получает id="grid",
 * чтобы каталог на главной мог ссылаться на /docs/components#grid.
 */
function rehypeComponentAnchors() {
  /** @param {any} tree */
  return (tree) => {
    /** @param {any} node */
    const walk = (node) => {
      if (node.type === 'element' && /^h[2-4]$/.test(node.tagName)) {
        const first = node.children?.[0];
        if (first?.type === 'element' && first.tagName === 'code') {
          const text = first.children?.map((/** @type {any} */ c) => c.value ?? '').join('');
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
  site: process.env.SITE_URL || 'https://htmlpptx.example',
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
