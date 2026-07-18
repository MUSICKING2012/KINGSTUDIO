// Download abuse guard (PRD §5.6): 50 downloads / 5 minutes per IP → temporary auto-block.
// Fixed-window counter on Redis (Upstash). The INCR + first-hit EXPIRE run in a single Lua eval so
// a key can never be left without a TTL (a split INCR/EXPIRE could strand a key with no expiry and,
// because EXPIRE is only attempted at count==1, block that IP forever). Injectable for unit tests.

import { getRedis } from '@/lib/redis/client';

export const DOWNLOAD_RATE_LIMIT = 50;
export const DOWNLOAD_RATE_WINDOW_SECONDS = 300;

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

export async function checkDownloadRateLimit(
  ip: string | null,
  redis: RateLimitRedis = getRedis(),
): Promise<{ allowed: boolean; count: number }> {
  // No attributable IP → do not block (logged as null in download_logs; abuse review is manual).
  if (!ip) return { allowed: true, count: 0 };

  const key = `dl_rate:${ip}`;
  const count = Number(await redis.eval(INCR_WITH_TTL, [key], [DOWNLOAD_RATE_WINDOW_SECONDS]));
  return { allowed: count <= DOWNLOAD_RATE_LIMIT, count };
}
