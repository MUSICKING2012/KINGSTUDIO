import { listSongs } from '@/lib/catalog/song-queries';
import { isSongPubliclyVisible } from '@/lib/catalog/song-visibility';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { defaultLocale, locales } from '@/lib/i18n/routing';
import { absoluteUrl, hreflangLanguages, songPath } from '@/lib/seo/urls';
import type { MetadataRoute } from 'next';

// ISR (PRD §6.3 / C18): song-detail URLs are dynamic DB reads, so the sitemap is regenerated at most
// every 24h. Admin catalog edits surface within `revalidate` without a redeploy.
export const revalidate = 86400;

// Structural/static routes (2b-SEO-infra-A): one entry per locale, with hreflang alternates.
//   '' = home, '/songs' = catalog LIST page, '/experience' + '/group' = per-category catalog entry
//   points (CategoryIA refactor). Individual song-detail URLs are appended below (W4).
// '/rental' is intentionally EXCLUDED: rental packages (1Hour/1Pro) are ko-only, so the route 404s in
// en/ja/zh-* — listing it would emit hreflang alternates to 4 non-200 URLs (200-invariant/hreflang
// violation). '/packages' is a 308 redirect (never a sitemap entry).
// NOTE: MetadataRoute.Sitemap's `alternates` only supports `languages` (no canonical), so entries use
// hreflangLanguages (5 locales + x-default=en) — buildAlternates (which adds canonical, for page
// generateMetadata) does not fit the sitemap shape.
const STATIC_PATHS = ['', '/songs', '/experience', '/group'] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  for (const path of STATIC_PATHS) {
    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(locale, path),
        alternates: { languages: hreflangLanguages(path) },
      });
    }
  }

  // Song-detail URLs (2b-2b-4 / W4). Publicly-visible songs ONLY — the SAME isSongPubliclyVisible
  // predicate the route/meta/JSON-LD use, so every sitemap song URL returns 200 and a route notFound
  // never appears here (the W4 invariant). slug lives on the Song body (locale-independent), so one
  // listSongs read (any locale; activeOnly:false → the predicate is the SOLE active/slug gate, never
  // re-implemented here) yields the slugs. ⚠ scale: at ~2,500 songs the sitemap shape/size/ordering
  // /50k split must be re-checked once real data lands (infra-B debt extension) — 1 entry for now.
  const songs = await listSongs({ locale: toPrismaLocale(defaultLocale), activeOnly: false });
  for (const song of songs) {
    // `|| song.slug === null` is redundant at runtime (the predicate already requires slug≠NULL) but
    // narrows slug to string for songPath below.
    if (!isSongPubliclyVisible(song) || song.slug === null) continue;
    const path = songPath(song.slug);
    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(locale, path),
        alternates: { languages: hreflangLanguages(path) },
      });
    }
  }
  return entries;
}
