import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// Loads the message catalog for the active request locale (referenced by next.config.mjs).
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Fall back to the default locale (en) for unknown/missing locales — CLAUDE.md §5.
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
