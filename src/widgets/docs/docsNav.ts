import { getCollection, type CollectionEntry } from 'astro:content';

export type DocEntry = CollectionEntry<'docs'>;

export const docHref = (d: DocEntry) => (d.id === 'index' ? '/docs' : `/docs/${d.id}`);

/** Страницы документации по группам, в порядке order */
export async function docsNav() {
  const all = (await getCollection('docs')).sort((a, b) => a.data.order - b.data.order);
  const groups: { title: string; items: DocEntry[] }[] = [];
  for (const d of all) {
    let g = groups.find((x) => x.title === d.data.group);
    if (!g) groups.push((g = { title: d.data.group, items: [] }));
    g.items.push(d);
  }
  return { all, groups };
}
