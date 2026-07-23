import type { SongView } from '@/lib/catalog/song-queries';
import { locales } from '@/lib/i18n/routing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// DB-free sitemap test (handoff memo #2: `songs` is owned by song-queries.test.ts — mocking listSongs
// keeps this file out of that table's parallel-worker race; the infra-B sitemap work hit this race
// and resolved it the same way). The REAL isSongPubliclyVisible predicate runs against mock songs, so
// the sitemap↔route gate is exercised, not re-implemented.
vi.mock('@/lib/catalog/song-queries', () => ({ listSongs: vi.fn() }));

import { listSongs } from '@/lib/catalog/song-queries';
import sitemap, { revalidate } from './sitemap';

const view = (over: Partial<SongView>): SongView => ({
  id: 'seed_song_dynamite',
  slug: 'bts-dynamite',
  title: 'Dynamite',
  artist: 'BTS',
  beginnerCuration: false,
  isActive: true,
  licenseVerified: { recording: false, mr_distribution: false, lyrics: false },
  ...over,
});

// The seed's 3-way mix: 1 visible + 1 inactive + 2 slug-NULL → only bts-dynamite is public.
const SEED_MIX: SongView[] = [
  view({ id: 's_dynamite', slug: 'bts-dynamite', isActive: true }),
  view({ id: 's_retired', slug: 'archive-retired-track', isActive: false }),
  view({ id: 's_jannabi', slug: null, isActive: true }),
  view({ id: 's_lovepoem', slug: null, isActive: true }),
];

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test';
});
beforeEach(() => {
  vi.mocked(listSongs).mockResolvedValue(SEED_MIX);
});

describe('app/sitemap — structural routes (infra-A + CategoryIA)', () => {
  it('emits home + /songs + /experience + /group for every locale', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    for (const l of locales) {
      expect(urls).toContain(`https://example.test/${l}`);
      expect(urls).toContain(`https://example.test/${l}/songs`);
      expect(urls).toContain(`https://example.test/${l}/experience`);
      expect(urls).toContain(`https://example.test/${l}/group`);
    }
  });

  it('excludes /rental (ko-only route → non-200 in en/ja/zh-*)', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => /\/rental$/.test(new URL(u).pathname))).toBe(false);
  });

  it('each entry carries hreflang alternates (x-default included)', async () => {
    const entries = await sitemap();
    expect(entries[0].alternates?.languages?.['x-default']).toBeDefined();
  });
});

describe('app/sitemap — song URLs (2b-2b-4 / W4)', () => {
  it('emits a song-detail URL per locale for a publicly-visible song + hreflang', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    for (const l of locales) {
      expect(urls).toContain(`https://example.test/${l}/songs/bts-dynamite`);
    }
    const en = entries.find((e) => e.url === 'https://example.test/en/songs/bts-dynamite');
    expect(en?.alternates?.languages?.['x-default']).toBe(
      'https://example.test/en/songs/bts-dynamite',
    );
    expect(Object.keys(en?.alternates?.languages ?? {}).sort()).toEqual(
      ['en', 'ja', 'ko', 'x-default', 'zh-CN', 'zh-HK'].sort(),
    );
  });

  it('excludes inactive songs (archive-retired-track not present)', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => u.includes('/songs/archive-retired-track'))).toBe(false);
  });

  it('excludes NULL-slug songs (jannabi / love-poem produce no URL)', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    const songDetail = urls.filter((u) => /\/songs\/[^/]+$/.test(new URL(u).pathname));
    // Only bts-dynamite × 5 locales — the two NULL-slug songs contribute nothing.
    expect(songDetail).toHaveLength(locales.length);
  });

  it('W4 invariant: song-detail URLs are exactly the isSongPubliclyVisible set', async () => {
    // With the 3-way mix, exactly 1 song is public → locales.length detail URLs, all bts-dynamite.
    const songDetail = (await sitemap())
      .map((e) => new URL(e.url).pathname)
      .filter((p) => /\/songs\/[^/]+$/.test(p));
    expect(new Set(songDetail.map((p) => p.split('/songs/')[1]))).toEqual(
      new Set(['bts-dynamite']),
    );
    expect(songDetail).toHaveLength(locales.length);
  });

  it('total = static (locales×4) + song (visible×locales)', async () => {
    expect(await sitemap()).toHaveLength(locales.length * 4 + 1 * locales.length);
  });
});

describe('app/sitemap — ISR', () => {
  it('revalidate = 86400 (24h, PRD §6.3 / C18)', () => {
    expect(revalidate).toBe(86400);
  });
});
