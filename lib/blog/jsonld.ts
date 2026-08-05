import type { Locale } from '@/lib/i18n/routing';
import { absoluteUrl } from '@/lib/seo/urls';
import type { BlogPost } from '@prisma/client';

// BlogPosting JSON-LD builder (5e-1). Pure + DB-free, mirrors lib/seo/song-jsonld.ts (route stays
// thin). Design snapshot policy carried over (`Blog Post.dc.html` audited exclusions): NO Review,
// AggregateRating, FAQPage, or HowTo. Author/publisher = Organization (posts are studio-authored).
// Draft posts never reach this builder — lib/blog/queries returns published rows only.
export function buildBlogPostJsonLd(post: BlogPost, locale: Locale): Record<string, unknown> {
  const url = absoluteUrl(locale, `/blog/${post.slug}`);
  const org = { '@type': 'Organization', name: 'KING STUDIO' };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        datePublished: post.publishedAt.toISOString().slice(0, 10),
        dateModified: post.updatedAt.toISOString().slice(0, 10),
        author: org,
        publisher: org,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Blog',
            item: absoluteUrl(locale, '/blog'),
          },
          { '@type': 'ListItem', position: 2, name: post.title },
        ],
      },
    ],
  };
}
