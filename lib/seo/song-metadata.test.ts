import { beforeAll, describe, expect, it } from 'vitest';

import type { SongView } from '@/lib/catalog/song-queries';
import { buildSongMetadata } from './song-metadata';

// 2b-2b-2: song-detail generateMetadata assembler. DB-free unit test — builds Metadata from mock
// SongView objects (no DB read, no mutation → does not race song-queries.test.ts, handoff note 2).
beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test';
});

// SongView factory: licenseVerified is irrelevant to meta (display gate is elsewhere) but required
// by the type, so all three C16 license rows default false.
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

describe('buildSongMetadata', () => {
  it('active + slug: title / description / canonical / hreflang / OpenGraph', () => {
    const meta = buildSongMetadata(song(), 'en');

    expect(meta.title).toBe('Dynamite');
    expect(meta.description).toBe('Disco-pop hit');

    // canonical = absolute URL for THIS locale's song path.
    expect(meta.alternates?.canonical).toBe('https://example.test/en/songs/bts-dynamite');

    // hreflang: 5 locales + x-default (= en, the default locale).
    const languages = meta.alternates?.languages as Record<string, string>;
    expect(Object.keys(languages).sort()).toEqual(
      ['en', 'ja', 'ko', 'x-default', 'zh-HK', 'zh-TW'].sort(),
    );
    expect(languages.ko).toBe('https://example.test/ko/songs/bts-dynamite');
    expect(languages['zh-TW']).toBe('https://example.test/zh-TW/songs/bts-dynamite');
    expect(languages['x-default']).toBe('https://example.test/en/songs/bts-dynamite');

    // Basic OpenGraph.
    expect(meta.openGraph?.title).toBe('Dynamite');
    expect(meta.openGraph?.url).toBe('https://example.test/en/songs/bts-dynamite');
    expect((meta.openGraph as { type?: string } | undefined)?.type).toBe('website');
  });

  it('canonical + hreflang follow the requested locale', () => {
    const meta = buildSongMetadata(song(), 'ja');
    expect(meta.alternates?.canonical).toBe('https://example.test/ja/songs/bts-dynamite');
    // x-default always points at the default locale (en), not the requested one.
    const languages = meta.alternates?.languages as Record<string, string>;
    expect(languages['x-default']).toBe('https://example.test/en/songs/bts-dynamite');
  });

  it('description present (en) is exposed; absent omits the key (optional path)', () => {
    const withDesc = buildSongMetadata(song({ description: 'A description' }), 'en');
    expect(withDesc.description).toBe('A description');
    expect(withDesc.openGraph?.description).toBe('A description');

    const noDesc = buildSongMetadata(song({ description: undefined }), 'en');
    expect('description' in noDesc).toBe(false);
    expect('description' in (noDesc.openGraph ?? {})).toBe(false);
  });

  it('inactive song → empty meta (consistent with the route notFound)', () => {
    expect(buildSongMetadata(song({ isActive: false }), 'en')).toEqual({});
  });

  it('NULL-slug song → empty meta (no canonical URL until Phase 2, handoff note 1)', () => {
    expect(buildSongMetadata(song({ slug: null }), 'en')).toEqual({});
  });

  it('missing song (null) → empty meta', () => {
    expect(buildSongMetadata(null, 'en')).toEqual({});
  });
});
