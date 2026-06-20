import { locales } from '@/lib/i18n/routing';
import { beforeAll, describe, expect, it } from 'vitest';
import sitemap from './sitemap';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test';
});

describe('app/sitemap (structural routes only — infra-A)', () => {
  it('emits home + /songs for every locale', () => {
    const urls = sitemap().map((e) => e.url);
    for (const l of locales) {
      expect(urls).toContain(`https://example.test/${l}`);
      expect(urls).toContain(`https://example.test/${l}/songs`);
    }
    expect(sitemap()).toHaveLength(locales.length * 2);
  });

  it('each entry carries hreflang alternates (x-default included)', () => {
    expect(sitemap()[0].alternates?.languages?.['x-default']).toBeDefined();
  });

  it('contains NO song-detail (slug) URLs — deferred to infra-B', () => {
    const detailLike = sitemap().filter((e) => /\/songs\/[^/]+$/.test(new URL(e.url).pathname));
    expect(detailLike).toHaveLength(0);
  });
});
