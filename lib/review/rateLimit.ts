// Review submission abuse guard: 5 submissions / 5 minutes per IP → temporary auto-block.
// PROVENANCE: this threshold is NOT from the PRD. Unlike the E1 download limit (PRD §5.6,
// "5분 내 50회"), §5.9 states no review-submission limit; the number was chosen by analogy
// with the login-failure lockout (§5.8, 5회/5분) and is stricter than the global API ceiling
// (100req/min/IP). Open item: reconcile in a §5.9 amendment before launch.
// Deliberate clone of lib/download/rateLimit.ts (E1) — that file is frozen (verified risk zone) and
// must not grow a second consumer; generalizing the two into one module is queued as debt for when
// a third consumer appears. Fixed-window counter on Redis (Upstash). The INCR + first-hit EXPIRE
// run in a single Lua eval so a key can never be left without a TTL (a split INCR/EXPIRE could
// strand a key with no expiry and, because EXPIRE is only attempted at count==1, block that IP
// forever). Injectable for unit tests.

import { getRedis } from '@/lib/redis/client';

export const REVIEW_RATE_LIMIT = 5;
export const REVIEW_RATE_WINDOW_SECONDS = 300;

// Atomic increment-and-set-initial-TTL. Returns the post-increment count.
const INCR_WITH_TTL = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return c
`;

// Minimal seam over Redis EVAL — Upstash's client and the unit-test fake both satisfy it.
export type RateLimitRedis = {
  eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown>;
};

export async function checkReviewRateLimit(
  ip: string | null,
  redis: RateLimitRedis = getRedis(),
): Promise<{ allowed: boolean; count: number }> {
  // No attributable IP → do not block (same policy as E1; review.ip is never populated anyway).
  if (!ip) return { allowed: true, count: 0 };

  const key = `rv_rate:${ip}`;
  const count = Number(await redis.eval(INCR_WITH_TTL, [key], [REVIEW_RATE_WINDOW_SECONDS]));
  return { allowed: count <= REVIEW_RATE_LIMIT, count };
}
