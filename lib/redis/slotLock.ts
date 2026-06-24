import { randomUUID } from 'node:crypto';
import { getRedis } from './client';

export const SLOT_LOCK_TTL_MS = 900_000; // 15 min (C19 §5.3)

// Atomic compare-and-delete: releases the key only if the stored token matches ours.
// Prevents a late TTL-triggered re-acquisition's lock from being released by an earlier holder.
const RELEASE_SCRIPT = `
if redis.call('GET',KEYS[1])==ARGV[1] then
  return redis.call('DEL',KEYS[1])
end
return 0
`;

export class SlotLockError extends Error {
  readonly roomId: string;
  readonly date: string;
  constructor(roomId: string, date: string) {
    super(`slot already locked: room=${roomId} date=${date}`);
    this.name = 'SlotLockError';
    this.roomId = roomId;
    this.date = date;
  }
}

// Acquires a room+date distributed lock (C19 §5.3), runs fn inside it, then releases.
// date must be a KST YYYY-MM-DD wall-clock string (never UTC-derived — C19 storage convention).
// Throws SlotLockError if the lock is already held; propagates fn errors after releasing.
export async function withSlotLock<T>(
  roomId: string,
  date: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = `slot_lock:${roomId}:${date}`;
  const token = randomUUID();
  const r = getRedis();
  const acquired = await r.set(key, token, { nx: true, px: SLOT_LOCK_TTL_MS });
  if (!acquired) throw new SlotLockError(roomId, date);
  try {
    return await fn();
  } finally {
    await r.eval(RELEASE_SCRIPT, [key], [token]);
  }
}
