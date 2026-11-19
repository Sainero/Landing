import { expect, type Page } from '@playwright/test';

/** Ошибки страницы и консоли за время теста: в конце их должно быть ноль */
export function watchErrors(page: Page): () => void {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  return () => expect(errors, errors.join('\n')).toEqual([]);
}

/** Номер слайда в показе Slideria: «4 из 14» */
export const deckCounter = (page: Page, frame: string) => page.frameLocator(frame).locator('#ct');
