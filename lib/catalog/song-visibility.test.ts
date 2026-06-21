import { describe, expect, it } from 'vitest';
import type { SongView } from './song-queries';
import { isSongPubliclyVisible } from './song-visibility';

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

// Public-visibility rule for a song reached by URL (2b-2b-1). The detail route → notFound() when
// this returns false.
describe('isSongPubliclyVisible', () => {
  it('true for an active, slug-bearing song', () => {
    expect(isSongPubliclyVisible(view({}))).toBe(true);
  });

  it('false when the song is missing (null lookup)', () => {
    expect(isSongPubliclyVisible(null)).toBe(false);
  });

  it('false for an inactive song even with a slug — direct URL stays private (core case)', () => {
    expect(isSongPubliclyVisible(view({ isActive: false, slug: 'archive-retired-track' }))).toBe(
      false,
    );
  });

  it('false for a NULL-slug song (no canonical URL until migration Phase 2)', () => {
    expect(isSongPubliclyVisible(view({ slug: null }))).toBe(false);
  });
});
