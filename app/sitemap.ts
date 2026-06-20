import { locales } from '@/lib/i18n/routing';
import { absoluteUrl, hreflangLanguages } from '@/lib/seo/urls';
import type { MetadataRoute } from 'next';

// Structural/static routes only (2b-SEO-infra-A): one entry per locale, with hreflang alternates.
//   '' = home, '/songs' = catalog LIST page (a structural route; individual song-detail URLs are
//   NOT here — they are slug-based and belong to infra-B).
const STATIC_PATHS = ['', '/songs'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const path of STATIC_PATHS) {
    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(locale, path),
        alternates: { languages: hreflangLanguages(path) },
      });
    }
  }
  // TODO(2b-SEO-infra-B, after the slug migration): append song-detail URLs
  // (/{locale}/songs/{slug}) fetched from the DB, and apply ISR `export const revalidate = 86400`
  // (PRD §6.3 / C18 — sitemap = ISR dynamic, 24h). Out of scope for infra-A.
  return entries;
}
