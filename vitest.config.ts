import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit-тесты: чистые функции сайта и скрипта синхронизации, без браузера — секунды
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
