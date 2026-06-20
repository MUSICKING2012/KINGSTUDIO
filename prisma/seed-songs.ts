import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { LicenseType, type Locale } from '@prisma/client';
import { prisma } from '../lib/db/prisma';

// Minimal song catalog seed (PRD §5.7 / C16). Real 200–500 songs are content Aiden fills later;
// this set is deliberately shaped so the §5.4 display fallback chain is fully exercisable:
//   - dynamite  → ko+en+ja translations  (requested-locale hit, e.g. ja → Japanese title)
//   - love-poem → en translation only, canonical ≠ en  (en fallback for any non-en locale, e.g.
//                 ja → English title — and canonical is the Korean original so the en branch is
//                 provably distinct from the canonical branch, not a value coincidence)
//   - jannabi   → NO translations         (canonical fallback — never drops from catalog)
//   - inactive  → isActive=false          (active-filter coverage)
// Fixed string ids make the seed idempotent (upsert by id; translations/licenses by their @@unique).
// canonicalTitle/canonicalArtist are NOT NULL (first follow-up migration) — always provided.

type Translation = { locale: Locale; title: string; artist: string };
type License = { type: LicenseType; verified: boolean };
type SongSeed = {
  id: string;
  canonicalTitle: string;
  canonicalArtist: string;
  beginnerCuration: boolean;
  isActive: boolean;
  translations: Translation[];
  licenses: License[];
};

export const SONGS: SongSeed[] = [
  {
    id: 'seed_song_dynamite',
    canonicalTitle: 'Dynamite',
    canonicalArtist: 'BTS',
    beginnerCuration: true,
    isActive: true,
    translations: [
      { locale: 'ko', title: '다이너마이트', artist: '방탄소년단' },
      { locale: 'en', title: 'Dynamite', artist: 'BTS' },
      { locale: 'ja', title: 'ダイナマイト', artist: 'BTS' },
    ],
    // recording cleared, MR distribution NOT — exercises per-type clearance (C16 / R2).
    licenses: [
      { type: LicenseType.recording, verified: true },
      { type: LicenseType.mr_distribution, verified: false },
    ],
  },
  {
    id: 'seed_song_love_poem',
    // Canonical = Korean original; the only translation is en. A ja/zh request must resolve to the
    // en title ('Through the Night'), which differs from canonical ('밤편지') — so this row proves
    // the en branch fires, not the canonical branch. (IU — 밤편지 / "Through the Night")
    canonicalTitle: '밤편지',
    canonicalArtist: '아이유',
    beginnerCuration: true,
    isActive: true,
    // en only → a ja/zh request falls back to English (NOT canonical, which is Korean here).
    translations: [{ locale: 'en', title: 'Through the Night', artist: 'IU' }],
    licenses: [{ type: LicenseType.recording, verified: true }],
  },
  {
    id: 'seed_song_jannabi',
    canonicalTitle: '주저하는 연인들을 위해',
    canonicalArtist: '잔나비',
    beginnerCuration: false,
    isActive: true,
    // No translations → display name comes from canonical for every locale.
    translations: [],
    licenses: [],
  },
  {
    id: 'seed_song_inactive',
    canonicalTitle: 'Retired Track',
    canonicalArtist: 'Archive',
    beginnerCuration: false,
    isActive: false,
    translations: [{ locale: 'en', title: 'Retired Track', artist: 'Archive' }],
    licenses: [],
  },
];

export async function seedSongs() {
  for (const { translations, licenses, ...song } of SONGS) {
    await prisma.song.upsert({ where: { id: song.id }, update: song, create: song });
    for (const t of translations) {
      await prisma.songTranslation.upsert({
        where: { songId_locale: { songId: song.id, locale: t.locale } },
        update: { title: t.title, artist: t.artist },
        create: { songId: song.id, ...t },
      });
    }
    for (const l of licenses) {
      await prisma.songLicense.upsert({
        where: { songId_type: { songId: song.id, type: l.type } },
        update: { verified: l.verified },
        create: { songId: song.id, ...l },
      });
    }
  }
}

// Run only when executed directly (`tsx prisma/seed-songs.ts`), not when imported by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedSongs()
    .then(() => console.log(`Seeded ${SONGS.length} songs.`))
    .finally(() => prisma.$disconnect());
}
