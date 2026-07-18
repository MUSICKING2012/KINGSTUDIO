import { describe, expect, it } from 'vitest';
import {
  REVIEW_RATE_LIMIT,
  REVIEW_RATE_WINDOW_SECONDS,
  type RateLimitRedis,
  checkReviewRateLimit,
} from './rateLimit';

// Fixed-window limiter unit tests with an injected fake Redis (no network). The fake models the Lua
// script's contract: INCR, and EXPIRE only on the first hit — set atomically, so a key that has a
// count always has a TTL (the invariant the real script guarantees). Mirrors the E1 suite
// (lib/download/rateLimit.test.ts) 1:1 — keep the two in structural sync.
function fakeRedis() {
  const counts = new Map<string, number>();
  const expires = new Map<string, number>();
  const r: RateLimitRedis = {
    async eval(_script, keys, args) {
      const key = keys[0] as string;
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      if (next === 1) expires.set(key, Number(args[0]));
      return next;
    },
  };
  return { r, counts, expires };
}

describe('checkReviewRateLimit (5/5min)', () => {
  it('allows up to the limit, blocks past it', async () => {
    const { r } = fakeRedis();
    let last = { allowed: true, count: 0 };
    for (let i = 0; i < REVIEW_RATE_LIMIT; i++) last = await checkReviewRateLimit('1.2.3.4', r);
    expect(last).toEqual({ allowed: true, count: REVIEW_RATE_LIMIT });
    expect((await checkReviewRateLimit('1.2.3.4', r)).allowed).toBe(false);
  });

  it('sets the window TTL together with the first increment', async () => {
    const { r, expires } = fakeRedis();
    await checkReviewRateLimit('9.9.9.9', r);
    await checkReviewRateLimit('9.9.9.9', r);
    expect(expires.get('rv_rate:9.9.9.9')).toBe(REVIEW_RATE_WINDOW_SECONDS);
    expect(expires.size).toBe(1);
  });

  it('a counted key always carries a TTL (no strand-without-expiry)', async () => {
    const { r, counts, expires } = fakeRedis();
    for (let i = 0; i < 3; i++) await checkReviewRateLimit('7.7.7.7', r);
    expect(counts.get('rv_rate:7.7.7.7')).toBe(3);
    expect(expires.has('rv_rate:7.7.7.7')).toBe(true);
  });

  it('isolates counters per IP', async () => {
    const { r } = fakeRedis();
    await checkReviewRateLimit('1.1.1.1', r);
    expect((await checkReviewRateLimit('2.2.2.2', r)).count).toBe(1);
  });

  it('never blocks when no attributable IP exists', async () => {
    const { r, counts } = fakeRedis();
    expect(await checkReviewRateLimit(null, r)).toEqual({ allowed: true, count: 0 });
    expect(counts.size).toBe(0);
  });
});
