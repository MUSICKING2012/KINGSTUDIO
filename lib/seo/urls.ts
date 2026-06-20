import { type Locale, defaultLocale, locales } from '@/lib/i18n/routing';

// SEO URL helpers (slug-independent site infra, 2b-SEO-infra-A). All URLs are locale-prefixed
// because routing uses localePrefix:'always' (every page has a canonical localized URL, §5.1).

// Site base URL, no trailing slash. Prod domain comes from env (§7 secrets); dev/test fallback.
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://kingstudio.co.kr').replace(/\/+$/, '');
}

// Locale-prefixed path. `path` is the route AFTER the locale segment ('' or leading-slash).
//   localizedPath('en', '')       → '/en'
//   localizedPath('en', '/songs') → '/en/songs'
export function localizedPath(locale: Locale, path = ''): string {
  const clean = path === '/' ? '' : path;
  return `/${locale}${clean}`;
}

export function absoluteUrl(locale: Locale, path = ''): string {
  return siteUrl() + localizedPath(locale, path);
}

// hreflang map for a path: one entry per supported locale + x-default (→ default locale).
// Locales are sourced from routing (no hardcoding).
export function hreflangLanguages(path = ''): Record<string, string> {
  const map: Record<string, string> = {};
  for (const locale of locales) {
    map[locale] = absoluteUrl(locale, path);
  }
  map['x-default'] = absoluteUrl(defaultLocale, path);
  return map;
}
