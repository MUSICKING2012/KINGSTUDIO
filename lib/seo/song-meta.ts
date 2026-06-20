import type { Locale } from '@/lib/i18n/routing';
import type { DerivedMeta } from './page-meta';
import { absoluteUrl, songPath } from './urls';

// Song → DerivedMeta builder (2b-SEO-infra-B / W3). Produces the meta a render layer (song-detail
// generateMetadata in 2b-2b) feeds into infra-A resolvePageMeta (override → derived → locale chain).
// Definition only — this is NOT wired into sitemap or any route here.
//
// Inputs are ALREADY locale-resolved by the W2 read layer (lib/catalog/song-queries): `title` via
// the §5.4 chain (req→en→canonical), `description` via req→en→undefined. SongView satisfies this
// shape, so a caller passes a SongView straight through.
export type SongMetaInput = {
  slug: string | null;
  title: string;
  description?: string;
};

// NULL-slug songs (non-ASCII canonical, pending migration Phase 2) have no canonical URL → null.
// Slug-bearing songs return a DerivedMeta with a non-null title + canonicalUrl.
export function buildSongDerivedMeta(song: SongMetaInput, locale: Locale): DerivedMeta | null {
  if (song.slug === null) return null;
  return {
    title: song.title,
    description: song.description,
    canonicalUrl: absoluteUrl(locale, songPath(song.slug)),
  };
}
