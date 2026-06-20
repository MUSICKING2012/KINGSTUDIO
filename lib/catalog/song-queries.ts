import { prisma } from '@/lib/db/prisma';
import type { Locale } from '@prisma/client';
import { LicenseType } from '@prisma/client';

// Song catalog read layer (PRD §5.4 / §5.7 / C16). Separate from queries.ts (packages) on purpose:
// songs and packages are different tables, so this file and catalog.test.ts never share a Vitest
// worker's DB state. UI lives in slice 2b — this layer returns raw display + license data and does
// NOT apply the license-display gate (that is the admin global toggle + 2b screen decision, §5.7).

// Per-type license clearance (C16: the single MR boolean was split into per-type rows so a song
// can be e.g. recording-OK but mr_distribution-NG). Missing row ⇒ false (not yet verified).
const LICENSE_TYPES = [
  LicenseType.recording,
  LicenseType.mr_distribution,
  LicenseType.lyrics,
] as const;

export type SongView = {
  id: string;
  // Display name resolved by the §5.4 fallback chain: requested locale → en → canonical.
  // A song ALWAYS has a display name (canonical is NOT NULL), so a missing translation never
  // drops it from the catalog.
  title: string;
  artist: string;
  beginnerCuration: boolean;
  isActive: boolean;
  // Per-type verified flags (C16). Exposed unconditionally — the display gate is in 2b/admin (§5.7).
  licenseVerified: Record<LicenseType, boolean>;
};

type SongWithRelations = {
  id: string;
  canonicalTitle: string;
  canonicalArtist: string;
  beginnerCuration: boolean;
  isActive: boolean;
  translations: { locale: Locale; title: string; artist: string }[];
  licenses: { type: LicenseType; verified: boolean }[];
};

// §5.4 fallback: requested locale translation → en translation → canonical (Song body, NOT NULL).
function resolveDisplay(
  song: SongWithRelations,
  locale: Locale,
): { title: string; artist: string } {
  const byLocale = new Map(song.translations.map((t) => [t.locale, t]));
  const t = byLocale.get(locale) ?? byLocale.get('en');
  return {
    title: t?.title ?? song.canonicalTitle,
    artist: t?.artist ?? song.canonicalArtist,
  };
}

function resolveLicenses(song: SongWithRelations): Record<LicenseType, boolean> {
  const verified = new Map(song.licenses.map((l) => [l.type, l.verified]));
  return Object.fromEntries(
    LICENSE_TYPES.map((type) => [type, verified.get(type) ?? false]),
  ) as Record<LicenseType, boolean>;
}

function toView(song: SongWithRelations, locale: Locale): SongView {
  const { title, artist } = resolveDisplay(song, locale);
  return {
    id: song.id,
    title,
    artist,
    beginnerCuration: song.beginnerCuration,
    isActive: song.isActive,
    licenseVerified: resolveLicenses(song),
  };
}

// List == detail shape (slice 2b decides any list↔detail field trimming). activeOnly mirrors the
// package read layer: inactive songs (isActive=false) drop from the catalog by default. beginnerCuration
// filter serves Gold's 입문자 curation (§5.2; indexed in schema).
export async function listSongs(opts: {
  locale: Locale;
  activeOnly?: boolean;
  beginnerCuration?: boolean;
}): Promise<SongView[]> {
  const { locale, activeOnly = true, beginnerCuration } = opts;
  const songs = await prisma.song.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(beginnerCuration === undefined ? {} : { beginnerCuration }),
    },
    include: { translations: true, licenses: true },
    orderBy: { createdAt: 'asc' },
  });
  return songs.map((s) => toView(s, locale));
}

// Direct id lookup — no active filter (like getPackageBySlug; the caller/2b decides visibility).
export async function getSong(id: string, locale: Locale): Promise<SongView | null> {
  const song = await prisma.song.findUnique({
    where: { id },
    include: { translations: true, licenses: true },
  });
  return song ? toView(song, locale) : null;
}
