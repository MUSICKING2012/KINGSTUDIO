import { defaultLocale, locales } from '@/lib/i18n/routing';
import { beforeAll, describe, expect, it } from 'vitest';
import { absoluteUrl, hreflangLanguages, localizedPath, siteUrl } from './urls';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test';
});

describe('seo/urls', () => {
  it('siteUrl strips trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test/';
    expect(siteUrl()).toBe('https://example.test');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test';
  });

  it('localizedPath prefixes the locale; home is the bare locale segment', () => {
    expect(localizedPath('en', '')).toBe('/en');
    expect(localizedPath('en', '/songs')).toBe('/en/songs');
    expect(localizedPath('zh-TW', '/songs')).toBe('/zh-TW/songs');
  });

  it('absoluteUrl = site base + localized path', () => {
    expect(absoluteUrl('ja', '/songs')).toBe('https://example.test/ja/songs');
  });

  it('hreflangLanguages covers every locale + x-default (= default locale)', () => {
    const map = hreflangLanguages('/songs');
    for (const l of locales) expect(map[l]).toBe(`https://example.test/${l}/songs`);
    expect(map['x-default']).toBe(absoluteUrl(defaultLocale, '/songs'));
    expect(Object.keys(map)).toHaveLength(locales.length + 1);
  });
});
