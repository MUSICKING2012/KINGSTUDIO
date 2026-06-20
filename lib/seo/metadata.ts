import type { Locale } from '@/lib/i18n/routing';
import type { Metadata } from 'next';
import { absoluteUrl, hreflangLanguages } from './urls';

// `alternates` block for a page's generateMetadata: canonical (current locale) + hreflang
// languages (every locale + x-default). Shared by all routes so hreflang stays consistent.
// `path` is the route after the locale segment ('' = home, '/songs' = catalog list).
export function buildAlternates(locale: Locale, path = ''): NonNullable<Metadata['alternates']> {
  return {
    canonical: absoluteUrl(locale, path),
    languages: hreflangLanguages(path),
  };
}
