import { siteUrl } from '@/lib/seo/urls';
import type { MetadataRoute } from 'next';

// §6.7 env separation: only Production is indexable. Staging and Production both run
// NODE_ENV=production, so staging opts out explicitly via SEO_DISALLOW_INDEXING (set in its separate
// GCP project). Local/dev (NODE_ENV !== 'production') never indexes. Base policy (production) =
// allow all + sitemap location.
function indexingDisallowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.SEO_DISALLOW_INDEXING === 'true';
}

export default function robots(): MetadataRoute.Robots {
  if (indexingDisallowed()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  const base = siteUrl();
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
