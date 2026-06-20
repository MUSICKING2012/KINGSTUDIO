// PageSeo / PageSchema consumer contract (2b-SEO-infra-A).
//
// The models (page_seo, page_schemas, schema_templates) already exist in schema.prisma. This file
// is the TYPE contract a render layer (e.g. song-detail generateMetadata in 2b-2b) consumes — it is
// the "what inputs produce what meta" boundary. NO rendering, NO slug, NO DB access, NO schema
// change here. The actual song-detail generateMetadata and JSON-LD output land in 2b-2b.

// Admin-entered override, one row per (page_path, locale) in page_seo. Subset a render layer reads.
export interface PageSeoOverride {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  ogImageUrl?: string | null;
  noindex?: boolean | null;
  nofollow?: boolean | null;
}

// Meta DERIVED from the content entity (e.g. a Song). The caller builds this AFTER applying the
// existing catalog locale fallback chain (requested → en → canonical, §5.4 — reuse
// lib/catalog/song-queries, do not re-implement). So `derived` is already locale-resolved.
export interface DerivedMeta {
  title: string;
  description?: string;
  canonicalUrl: string;
  ogImageUrl?: string;
}

// Final meta a render layer emits.
export interface ResolvedMeta {
  title: string;
  description?: string;
  canonicalUrl: string;
  ogImageUrl?: string;
  noindex: boolean;
  nofollow: boolean;
}

// Fallback priority (PRD §6.3 / C18): PageSeo override → Song-derived → locale chain.
// The locale chain is applied upstream (in `derived`); this resolver applies the override→derived
// layer: a non-blank override field wins, otherwise the derived value is kept.
export function resolvePageMeta(
  derived: DerivedMeta,
  override?: PageSeoOverride | null,
): ResolvedMeta {
  const pick = (o: string | null | undefined, d?: string): string | undefined => {
    const trimmed = o?.trim();
    return trimmed ? trimmed : d;
  };
  return {
    title: pick(override?.title, derived.title) ?? derived.title,
    description: pick(override?.description, derived.description),
    canonicalUrl: pick(override?.canonicalUrl, derived.canonicalUrl) ?? derived.canonicalUrl,
    ogImageUrl: pick(override?.ogImageUrl, derived.ogImageUrl),
    noindex: override?.noindex ?? false,
    nofollow: override?.nofollow ?? false,
  };
}
