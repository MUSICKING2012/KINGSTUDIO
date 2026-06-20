import { locales } from '@/lib/i18n/routing';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildAlternates } from './metadata';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test';
});

describe('seo/metadata buildAlternates', () => {
  it('canonical is the current-locale absolute URL', () => {
    expect(buildAlternates('en', '/songs').canonical).toBe('https://example.test/en/songs');
  });

  it('languages cover all locales + x-default', () => {
    const langs = buildAlternates('en', '/songs').languages as Record<string, string>;
    for (const l of locales) expect(langs[l]).toBeDefined();
    expect(langs['x-default']).toBe('https://example.test/en/songs');
  });
});
