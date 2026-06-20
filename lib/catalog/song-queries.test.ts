import { prisma } from '@/lib/db/prisma';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { SONGS, seedSongs } from '../../prisma/seed-songs';
import { getSong, listSongs } from './song-queries';

// Owns the `songs` table (+ cascaded translations/licenses) — a different table than catalog.test.ts
// (`packages`), so the two files never race across Vitest workers. Deleting a song cascades its
// translations and licenses (onDelete: Cascade).
beforeEach(async () => {
  await prisma.song.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('seedSongs', () => {
  it('seeds all songs with canonical names (NOT NULL)', async () => {
    await seedSongs();
    expect(await prisma.song.count()).toBe(SONGS.length);
    const dynamite = await prisma.song.findUniqueOrThrow({ where: { id: 'seed_song_dynamite' } });
    expect(dynamite.canonicalTitle).toBe('Dynamite');
    expect(dynamite.canonicalArtist).toBe('BTS');
  });
  it('is idempotent (run twice → same count, no duplicate translations/licenses)', async () => {
    await seedSongs();
    await seedSongs();
    expect(await prisma.song.count()).toBe(SONGS.length);
    expect(await prisma.songTranslation.count()).toBe(5); // 3 + 1 + 0 + 1
    expect(await prisma.songLicense.count()).toBe(3); // 2 + 1 + 0 + 0
  });
});

describe('song read layer (§5.4 fallback / §5.7 / C16)', () => {
  beforeEach(async () => {
    await seedSongs(); // after the outer deleteMany → clean + seeded
  });

  describe('locale fallback chain: requested → en → canonical', () => {
    it('returns the requested-locale translation when present (ja → Japanese)', async () => {
      const ja = await listSongs({ locale: 'ja' });
      const dynamite = ja.find((s) => s.id === 'seed_song_dynamite');
      expect(dynamite).toMatchObject({ title: 'ダイナマイト', artist: 'BTS' });
    });

    it('falls back to en when the requested locale is missing (ja → English)', async () => {
      const ja = await listSongs({ locale: 'ja' });
      const lovePoem = ja.find((s) => s.id === 'seed_song_love_poem');
      // love-poem has en only and a Korean canonical ('밤편지'); a ja request must resolve to the
      // English translation ('Through the Night'), proving the en branch fired — NOT canonical.
      expect(lovePoem).toMatchObject({ title: 'Through the Night', artist: 'IU' });
    });

    it('falls back to canonical when there is no translation at all (any locale)', async () => {
      for (const locale of ['ja', 'ko', 'zh_TW', 'zh_HK', 'en'] as const) {
        const songs = await listSongs({ locale });
        const jannabi = songs.find((s) => s.id === 'seed_song_jannabi');
        expect(jannabi).toMatchObject({
          title: '주저하는 연인들을 위해',
          artist: '잔나비',
        });
      }
    });

    it('every active song has a display name — none drops from the catalog for a missing translation', async () => {
      const zhHk = await listSongs({ locale: 'zh_HK' }); // no song has a zh_HK translation
      const activeCount = SONGS.filter((s) => s.isActive).length;
      expect(zhHk).toHaveLength(activeCount);
      for (const s of zhHk) {
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.artist.length).toBeGreaterThan(0);
      }
    });
  });

  describe('license_verified exposure (§5.7 — not gated in the read layer)', () => {
    it('returns per-type verified flags unconditionally (C16: recording-OK, mr_distribution-NG)', async () => {
      const songs = await listSongs({ locale: 'en' });
      const dynamite = songs.find((s) => s.id === 'seed_song_dynamite');
      expect(dynamite?.licenseVerified).toEqual({
        recording: true,
        mr_distribution: false,
        lyrics: false,
      });
    });

    it('defaults every license type to false when a song has no license rows', async () => {
      const songs = await listSongs({ locale: 'en' });
      const jannabi = songs.find((s) => s.id === 'seed_song_jannabi');
      expect(jannabi?.licenseVerified).toEqual({
        recording: false,
        mr_distribution: false,
        lyrics: false,
      });
    });
  });

  describe('active filter', () => {
    it('excludes inactive songs by default', async () => {
      const ids = (await listSongs({ locale: 'en' })).map((s) => s.id);
      expect(ids).not.toContain('seed_song_inactive');
    });
    it('includes inactive songs when activeOnly=false', async () => {
      const ids = (await listSongs({ locale: 'en', activeOnly: false })).map((s) => s.id);
      expect(ids).toContain('seed_song_inactive');
    });
  });

  describe('beginnerCuration filter (Gold 입문자 큐레이션, §5.2)', () => {
    it('returns only curated songs when beginnerCuration=true', async () => {
      const ids = (await listSongs({ locale: 'en', beginnerCuration: true })).map((s) => s.id);
      expect(ids.sort()).toEqual(['seed_song_dynamite', 'seed_song_love_poem']);
    });
  });

  describe('getSong', () => {
    it('returns the resolved view (list == detail shape) or null', async () => {
      const dynamite = await getSong('seed_song_dynamite', 'ko');
      expect(dynamite).toMatchObject({
        id: 'seed_song_dynamite',
        title: '다이너마이트',
        artist: '방탄소년단',
        beginnerCuration: true,
        isActive: true,
        licenseVerified: { recording: true, mr_distribution: false, lyrics: false },
      });
      expect(await getSong('nope', 'en')).toBeNull();
    });
    it('returns an inactive song by id (no active filter, like getPackageBySlug)', async () => {
      const inactive = await getSong('seed_song_inactive', 'en');
      expect(inactive?.isActive).toBe(false);
    });
  });
});
