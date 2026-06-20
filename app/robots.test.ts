import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from './robots';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('app/robots', () => {
  it('production: allow all + sitemap location', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SEO_DISALLOW_INDEXING', '');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://kingstudio.co.kr');
    const r = robots();
    expect(r.rules).toEqual([{ userAgent: '*', allow: '/' }]);
    expect(r.sitemap).toBe('https://kingstudio.co.kr/sitemap.xml');
  });

  it('non-production (local/dev) never indexes: disallow all, no sitemap', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const r = robots();
    expect(r.rules).toEqual([{ userAgent: '*', disallow: '/' }]);
    expect(r.sitemap).toBeUndefined();
  });

  it('staging opt-out: SEO_DISALLOW_INDEXING=true disallows even under production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SEO_DISALLOW_INDEXING', 'true');
    expect(robots().rules).toEqual([{ userAgent: '*', disallow: '/' }]);
  });
});
