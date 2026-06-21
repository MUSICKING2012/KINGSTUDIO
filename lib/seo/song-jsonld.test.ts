import { describe, expect, it } from 'vitest';

import type { SongView } from '@/lib/catalog/song-queries';
import { MUSIC_RECORDING_REQUIRED_FIELDS, buildSongJsonLd } from './song-jsonld';

// 2b-2b-3: MusicRecording JSON-LD builder. DB-free unit test — builds from mock SongView objects (no
// DB read/mutation → does not race song-queries.test.ts, handoff note 2).
function song(overrides: Partial<SongView> = {}): SongView {
  return {
    id: 's1',
    slug: 'bts-dynamite',
    title: 'Dynamite',
    artist: 'BTS',
    description: 'Disco-pop hit',
    beginnerCuration: false,
    isActive: true,
    licenseVerified: { recording: false, mr_distribution: false, lyrics: false },
    ...overrides,
  };
}

describe('buildSongJsonLd', () => {
  it('active + slug: MusicRecording object with name / byArtist / recordingOf / description', () => {
    const jsonLd = buildSongJsonLd(song(), 'en');
    expect(jsonLd).toEqual({
      '@context': 'https://schema.org',
      '@type': 'MusicRecording',
      name: 'Dynamite',
      byArtist: { '@type': 'MusicGroup', name: 'BTS' },
      recordingOf: { '@type': 'MusicComposition', name: 'Dynamite' },
      description: 'Disco-pop hit',
    });
  });

  it('A↔B consistency: output contains every seeded requiredFields key', () => {
    const jsonLd = buildSongJsonLd(song(), 'en');
    if (jsonLd === null) throw new Error('expected non-null JSON-LD');
    for (const field of MUSIC_RECORDING_REQUIRED_FIELDS) {
      expect(jsonLd).toHaveProperty(field);
    }
  });

  it('description omitted when absent — no empty keys (PRD decision 2)', () => {
    const jsonLd = buildSongJsonLd(song({ description: undefined }), 'en');
    if (jsonLd === null) throw new Error('expected non-null JSON-LD');
    expect('description' in jsonLd).toBe(false);
    // Required fields still present.
    expect(jsonLd.name).toBe('Dynamite');
    expect(jsonLd.byArtist).toEqual({ '@type': 'MusicGroup', name: 'BTS' });
  });

  it('serializes to valid JSON', () => {
    const jsonLd = buildSongJsonLd(song(), 'en');
    const roundTripped = JSON.parse(JSON.stringify(jsonLd));
    expect(roundTripped['@type']).toBe('MusicRecording');
  });

  it('inactive song → null (no JSON-LD, consistent with the route notFound)', () => {
    expect(buildSongJsonLd(song({ isActive: false }), 'en')).toBeNull();
  });

  it('NULL-slug song → null', () => {
    expect(buildSongJsonLd(song({ slug: null }), 'en')).toBeNull();
  });

  it('missing song (null) → null', () => {
    expect(buildSongJsonLd(null, 'en')).toBeNull();
  });
});
