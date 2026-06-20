import { beforeAll, describe, expect, it } from 'vitest';
import { resolvePageMeta } from './page-meta';
import { buildSongDerivedMeta } from './song-meta';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test';
});

// W3 (2b-SEO-infra-B): Song (already W2-resolved: title via §5.4, description via req→en→undefined)
// → DerivedMeta for infra-A resolvePageMeta. Definition only — NOT wired to sitemap/route (2b-2b).
describe('buildSongDerivedMeta', () => {
  it('derives title + description + canonical URL for a slug-bearing song', () => {
    const derived = buildSongDerivedMeta(
      { slug: 'bts-dynamite', title: 'Dynamite', description: 'desc' },
      'en',
    );
    expect(derived).toEqual({
      title: 'Dynamite',
      description: 'desc',
      canonicalUrl: 'https://example.test/en/songs/bts-dynamite',
    });
  });

  it('omits description when undefined; canonical follows the locale', () => {
    const derived = buildSongDerivedMeta(
      { slug: 'bts-dynamite', title: 'Dynamite', description: undefined },
      'ja',
    );
    expect(derived?.description).toBeUndefined();
    expect(derived?.canonicalUrl).toBe('https://example.test/ja/songs/bts-dynamite');
  });

  it('returns null for a NULL-slug song (no detail URL until migration Phase 2)', () => {
    expect(
      buildSongDerivedMeta({ slug: null, title: 'X', description: undefined }, 'en'),
    ).toBeNull();
  });

  it('output feeds infra-A resolvePageMeta (override wins, canonical preserved)', () => {
    const derived = buildSongDerivedMeta(
      { slug: 'bts-dynamite', title: 'Derived title', description: 'd' },
      'en',
    );
    if (!derived) throw new Error('expected non-null derived meta');
    const resolved = resolvePageMeta(derived, { title: 'Admin override' });
    expect(resolved.title).toBe('Admin override');
    expect(resolved.canonicalUrl).toBe('https://example.test/en/songs/bts-dynamite');
  });
});
