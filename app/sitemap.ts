import { listBlogPosts } from '@/lib/blog/queries';
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
//   '' = home, '/songs' = catalog LIST page, '/product' + '/group' = per-category catalog entry
//   points (CategoryIA refactor). Individual song-detail URLs are appended below (W4).
// '/studios' is INCLUDED as of 5d-3: the page is an all-locale studio intro (200 everywhere,
// rental cards render only where rental packages exist), so the 200-invariant/hreflang concern
// that excluded it in 5d-1~2 no longer applies (`Studio_Slice_Spec.md` §4-B). '/packages' and
// '/rental' are 308 redirects (never sitemap entries).
// NOTE: MetadataRoute.Sitemap's `alternates` only supports `languages` (no canonical), so entries use
// hreflangLanguages (5 locales + x-default=en) — buildAlternates (which adds canonical, for page
// generateMetadata) does not fit the sitemap shape.
// '/blog' 는 5e-2(Ghost 이관 완료)부터 포함 — 빈 목록 색인 회피 게이트 해제(Blog_Slice_Spec §2-ⓐ).
const STATIC_PATHS = ['', '/songs', '/product', '/group', '/studios', '/blog'] as const;

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
  // Blog post URLs (5e-2, W4 계열): listBlogPosts 는 published-only 를 모듈 차원에서 보장하므로
  // 여기 등재된 URL 은 항상 200(라우트도 같은 read layer 사용). 본문은 en 단일(결정 ⓒ)이지만
  // 페이지는 전 로케일 200 — songs 와 동일하게 로케일별 entry + hreflang alternates.
  const posts = await listBlogPosts();
  for (const post of posts) {
    const path = `/blog/${post.slug}`;
    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(locale, path),
        alternates: { languages: hreflangLanguages(path) },
      });
    }
  }
  return entries;
}
