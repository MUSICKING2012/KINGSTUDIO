import type { SongView } from '@/lib/catalog/song-queries';
import { isSongPubliclyVisible } from '@/lib/catalog/song-visibility';
import type { Locale } from '@/lib/i18n/routing';

// MusicRecording JSON-LD builder (2b-2b-3). Pure + DB-free: takes an already-loaded SongView and
// returns the schema.org MusicRecording object the song-detail route embeds as
// <script type="application/ld+json">. Mirrors song-metadata.ts (CLAUDE.md §2 — logic in /lib, route
// stays thin). Per PRD §6.3 "곡 MusicRecording JSON-LD 계약" (decisions 1·2):
//   • type = MusicRecording, with recordingOf → MusicComposition (King Studio is not the official
//     master owner; recordingOf points at the underlying work for semantic accuracy).
//   • Product/Offer is deliberately NOT used — the song page has no price/offer.
//
// A↔B link (approved Option 2): the route does NOT read the SchemaTemplate DB row at render time.
// The row is a registry/metadata entry; this code is the implementation. The two are kept consistent
// by the `type` contract + this field list (asserted by tests against the seeded requiredFields).
export const MUSIC_RECORDING_REQUIRED_FIELDS = ['name', 'byArtist', 'recordingOf'] as const;

// Visibility: same isSongPubliclyVisible gate as the page + generateMetadata — a private song
// (missing / inactive / NULL-slug) yields null (no JSON-LD), consistent with the route notFound().
// `_locale`: SongView is already §5.4 locale-resolved by the read layer, and the contract has no
// locale-dependent JSON-LD field (inLanguage etc. are out of scope), so locale is unused here; kept
// in the signature to match the meta/JSON-LD builders and the read path.
export function buildSongJsonLd(
  song: SongView | null,
  _locale: Locale,
): Record<string, unknown> | null {
  if (!isSongPubliclyVisible(song)) return null;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: song.title,
    byArtist: { '@type': 'MusicGroup', name: song.artist },
    // The underlying work this recording captures; name = song title (track == work name here).
    recordingOf: { '@type': 'MusicComposition', name: song.title },
  };

  // Optional: include description only when present (same source/rule as the meta description).
  // Absent/empty values are omitted entirely — no empty keys (PRD decision 2).
  if (song.description) jsonLd.description = song.description;

  return jsonLd;
}
