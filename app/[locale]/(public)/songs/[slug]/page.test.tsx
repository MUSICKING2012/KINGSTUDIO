import type { SongView } from '@/lib/catalog/song-queries';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// DB-free route test (handoff memo #2: `songs` table is owned by song-queries.test.ts — mocking the
// read keeps this file out of that table's parallel-worker race). next-intl/next-navigation are
// mocked for the same isolation. notFound() throws (it returns `never` in Next), so a gated request
// rejects with our sentinel.
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
import SongDetailPage from './page';

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
