import { describe, expect, it } from 'vitest';
import {
  DOWNLOAD_RATE_LIMIT,
  DOWNLOAD_RATE_WINDOW_SECONDS,
  type RateLimitRedis,
  checkDownloadRateLimit,
} from './rateLimit';

// Fixed-window limiter unit tests with an injected fake Redis (no network).
function fakeRedis() {
  const counts = new Map<string, number>();
  const expires = new Map<string, number>();
  const r: RateLimitRedis = {
    async incr(key) {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
    async expire(key, seconds) {
      expires.set(key, seconds);
      return 1;
    },
  };
  return { r, counts, expires };
}

describe('checkDownloadRateLimit (PRD §5.6 50/5min)', () => {
  it('allows up to the limit, blocks past it', async () => {
    const { r } = fakeRedis();
    let last = { allowed: true, count: 0 };
    for (let i = 0; i < DOWNLOAD_RATE_LIMIT; i++) last = await checkDownloadRateLimit('1.2.3.4', r);
    expect(last).toEqual({ allowed: true, count: DOWNLOAD_RATE_LIMIT });
    expect((await checkDownloadRateLimit('1.2.3.4', r)).allowed).toBe(false);
  });

  it('sets the window TTL only on the first hit', async () => {
    const { r, expires } = fakeRedis();
    await checkDownloadRateLimit('9.9.9.9', r);
    await checkDownloadRateLimit('9.9.9.9', r);
    expect(expires.get('dl_rate:9.9.9.9')).toBe(DOWNLOAD_RATE_WINDOW_SECONDS);
    expect(expires.size).toBe(1);
  });

  it('isolates counters per IP', async () => {
    const { r } = fakeRedis();
    await checkDownloadRateLimit('1.1.1.1', r);
    expect((await checkDownloadRateLimit('2.2.2.2', r)).count).toBe(1);
  });

  it('never blocks when no attributable IP exists', async () => {
    const { r, counts } = fakeRedis();
    expect(await checkDownloadRateLimit(null, r)).toEqual({ allowed: true, count: 0 });
    expect(counts.size).toBe(0);
  });
});
