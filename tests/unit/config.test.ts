// Связь сайта с облаком и установщиком — только адреса из переменных окружения
import { afterEach, describe, expect, it, vi } from 'vitest';

const load = async () => {
  vi.resetModules();
  return import('@/shared/lib/config');
};

afterEach(() => vi.unstubAllEnvs());

describe('облако', () => {
  it('без адреса — раздел #cloud, кнопки помечены «скоро»', async () => {
    vi.stubEnv('PUBLIC_CLOUD_URL', '');
    const c = await load();
    expect(c.isCloudLive).toBe(false);
    expect(c.cloudHref('/login')).toBe('/#cloud');
  });

  it('с адресом — ссылка внутрь облака, без двойной косой черты', async () => {
    vi.stubEnv('PUBLIC_CLOUD_URL', 'https://app.slideria.example/');
    const c = await load();
    expect(c.isCloudLive).toBe(true);
    expect(c.cloudHref()).toBe('https://app.slideria.example/');
    expect(c.cloudHref('/new?template=basic')).toBe('https://app.slideria.example/new?template=basic');
  });
});

describe('установщик', () => {
  it('ссылка появляется, только когда задана', async () => {
    vi.stubEnv('PUBLIC_DOWNLOAD_URL', '');
    expect((await load()).isDownloadLive).toBe(false);
    vi.stubEnv('PUBLIC_DOWNLOAD_URL', 'https://slideria.example/Slideria-Setup.exe');
    const c = await load();
    expect(c.isDownloadLive).toBe(true);
    expect(c.siteConfig.downloadUrl).toBe('https://slideria.example/Slideria-Setup.exe');
  });
});

describe('sizeLabel', () => {
  it('килобайты и мегабайты по-русски', async () => {
    const { sizeLabel } = await load();
    expect(sizeLabel(980)).toBe('980 КБ');
    expect(sizeLabel(2799)).toBe('2,7 МБ');
    expect(sizeLabel(null)).toBe('');
  });
});
