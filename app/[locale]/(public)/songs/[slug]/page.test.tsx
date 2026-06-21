import type { SongView } from '@/lib/catalog/song-queries';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// DB-free route test (handoff memo #2: `songs` table is owned by song-queries.test.ts — mocking the
// read keeps this file out of that table's parallel-worker race). next-intl/next-navigation are
// mocked for the same isolation. notFound() throws (it returns `never` in Next), so a gated request
// rejects with our sentinel.
// React `cache` is RSC-only (undefined on react 18.3's default export; Next supplies it via the
// react-server condition at runtime). Stub it as an identity passthrough so importing the route
// — which wraps its DB loader in cache() to dedupe generateMetadata + page — works under vitest.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, cache: <T,>(fn: T) => fn };
});
vi.mock('next-intl/server', () => ({ setRequestLocale: vi.fn() }));
const NOT_FOUND = new Error('NEXT_NOT_FOUND');
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw NOT_FOUND;
  }),
}));
vi.mock('@/lib/catalog/song-queries', () => ({ getSongBySlug: vi.fn() }));

import { getSongBySlug } from '@/lib/catalog/song-queries';
import { notFound } from 'next/navigation';
import SongDetailPage, { generateMetadata } from './page';

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
const call = (slug: string) => SongDetailPage({ params: { locale: 'en', slug } });
const meta = (slug: string) => generateMetadata({ params: { locale: 'en', slug } });

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test';
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('songs/[slug] route (2b-2b-1)', () => {
  it('renders for an active, slug-bearing song (bts-dynamite)', async () => {
    vi.mocked(getSongBySlug).mockResolvedValue(view({}));
    const el = await call('bts-dynamite');
    expect(el).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('notFound() when the slug matches no song', async () => {
    vi.mocked(getSongBySlug).mockResolvedValue(null);
    await expect(call('no-such-slug')).rejects.toBe(NOT_FOUND);
    expect(notFound).toHaveBeenCalledOnce();
  });

  it('notFound() for an inactive song — direct URL is private ((b), core case)', async () => {
    vi.mocked(getSongBySlug).mockResolvedValue(
      view({ isActive: false, slug: 'archive-retired-track' }),
    );
    await expect(call('archive-retired-track')).rejects.toBe(NOT_FOUND);
    expect(notFound).toHaveBeenCalledOnce();
  });
});

// generateMetadata (2b-2b-2) wires the same query + predicate as the page; it returns EMPTY meta for
// private songs (the page component owns notFound()). Assembler internals are unit-tested in
// lib/seo/song-metadata.test.ts — these cover the route wiring (same gate as the rendered page).
describe('songs/[slug] generateMetadata (2b-2b-2)', () => {
  it('emits title + canonical + hreflang for an active, slug-bearing song', async () => {
    vi.mocked(getSongBySlug).mockResolvedValue(view({ description: 'Disco-pop hit' }));
    const m = await meta('bts-dynamite');
    expect(m.title).toBe('Dynamite');
    expect(m.description).toBe('Disco-pop hit');
    expect(m.alternates?.canonical).toBe('https://example.test/en/songs/bts-dynamite');
    expect((m.alternates?.languages as Record<string, string>)['x-default']).toBe(
      'https://example.test/en/songs/bts-dynamite',
    );
    expect(notFound).not.toHaveBeenCalled();
  });

  it('empty meta for an inactive song (consistent with the page notFound)', async () => {
    vi.mocked(getSongBySlug).mockResolvedValue(
      view({ isActive: false, slug: 'archive-retired-track' }),
    );
    await expect(meta('archive-retired-track')).resolves.toEqual({});
  });

  it('empty meta when the slug matches no song', async () => {
    vi.mocked(getSongBySlug).mockResolvedValue(null);
    await expect(meta('no-such-slug')).resolves.toEqual({});
  });
});
