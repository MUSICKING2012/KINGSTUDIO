import type { Metadata } from 'next';

import type { SongView } from '@/lib/catalog/song-queries';
import { isSongPubliclyVisible } from '@/lib/catalog/song-visibility';
import type { Locale } from '@/lib/i18n/routing';
import { buildAlternates } from './metadata';
import { resolvePageMeta } from './page-meta';
import { buildSongDerivedMeta } from './song-meta';
import { songPath } from './urls';

// Song-detail Next Metadata assembler (2b-2b-2). Pure + DB-free: takes an already-loaded SongView
// (the route does the DB read, deduped via React cache) and produces the `Metadata` object its
// generateMetadata returns. Kept out of the route file so it is unit-testable without DB/next-runtime
// (CLAUDE.md §2 — domain logic in /lib, route stays thin).
//
// Visibility gate is the SAME predicate the page component uses (isSongPubliclyVisible): a private
// song (missing / inactive / NULL-slug) yields EMPTY meta here, and the page component owns the
// notFound() (single 404 authority, shipped in 2b-2b-1). Both paths run the same predicate + query,
// so meta and the rendered page never disagree on visibility.
export function buildSongMetadata(song: SongView | null, locale: Locale): Metadata {
  if (!isSongPubliclyVisible(song)) return {};

  // buildSongDerivedMeta returns null for a NULL-slug song (handoff note 1 — no canonical URL until
  // migration Phase 2). The `song.slug === null` arm is redundant at runtime but narrows slug to
  // string for songPath() below; both keep meta consistent with the route's notFound() path.
  const derived = buildSongDerivedMeta(song, locale);
  if (derived === null || song.slug === null) return {};

  // PageSeo override → Song-derived → locale chain (infra-A). No PageSeo read path exists yet
  // (model in schema.prisma, no query helper) — override is unwired this slice (DEBT, 2b-2b-2):
  // pass null so only the derived layer applies. Wiring the override = a later slice.
  const resolved = resolvePageMeta(derived, null);

  return {
    title: resolved.title,
    // description is optional (requested → en → undefined); omit the key entirely when absent.
    ...(resolved.description ? { description: resolved.description } : {}),
    // canonical (current locale) + hreflang (5 locales + x-default=en) for the song URL.
    alternates: buildAlternates(locale, songPath(song.slug)),
    // Basic OpenGraph only (richer music.song type + JSON-LD MusicRecording are 2b-2b-3).
    openGraph: {
      title: resolved.title,
      ...(resolved.description ? { description: resolved.description } : {}),
      url: resolved.canonicalUrl,
      type: 'website',
    },
  };
}
