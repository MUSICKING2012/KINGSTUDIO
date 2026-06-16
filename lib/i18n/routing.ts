import { defineRouting } from 'next-intl/routing';

/**
 * i18n routing config — single source of truth for supported locales.
 * PRD §5.1 / CLAUDE.md §5: 5 locales, subpath strategy (/ko /en /ja /zh-Hans /zh-Hant).
 * `en` is the required fallback default.
 */
export const locales = ['ko', 'en', 'ja', 'zh-Hans', 'zh-Hant'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Always show the locale prefix so every page has a canonical localized URL (hreflang/SEO, PRD §5.1).
  localePrefix: 'always',
});
