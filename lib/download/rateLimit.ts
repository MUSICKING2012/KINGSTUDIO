// Download abuse guard (PRD §5.6): 50 downloads / 5 minutes per IP → temporary auto-block.
// Fixed-window INCR+EXPIRE on Redis (Upstash). Injectable client for unit tests.

import { getRedis } from '@/lib/redis/client';

export const DOWNLOAD_RATE_LIMIT = 50;
export const DOWNLOAD_RATE_WINDOW_SECONDS = 300;

export type RateLimitRedis = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
};

export async function checkDownloadRateLimit(
  ip: string | null,
  redis: RateLimitRedis = getRedis(),
): Promise<{ allowed: boolean; count: number }> {
  // No attributable IP → do not block (logged as null in download_logs; abuse review is manual).
  if (!ip) return { allowed: true, count: 0 };

  const key = `dl_rate:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, DOWNLOAD_RATE_WINDOW_SECONDS);
  return { allowed: count <= DOWNLOAD_RATE_LIMIT, count };
}
