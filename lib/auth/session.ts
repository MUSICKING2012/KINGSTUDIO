import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import type { RequestMeta } from './device';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// Creates a user_sessions row; returns the row id (= JWT sessionId) and the raw token (kept only in the JWT).
export async function createSession(userId: string, meta: RequestMeta) {
  const rawToken = randomBytes(32).toString('hex');
  const row = await prisma.userSession.create({
    data: {
      userId,
      tokenHash: sha256(rawToken), // 🔒 store hash only
      ip: meta.ip,
      country: meta.country,
      userAgent: meta.userAgent,
      expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
      lastActiveAt: new Date(),
    },
  });
  return { sessionId: row.id, rawToken };
}

// Source of truth for "is this JWT still valid". Sliding: refresh lastActiveAt + expiry.
export async function validateSession(sessionId: string): Promise<{ userId: string } | null> {
  const row = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!row || (row.expiresAt && row.expiresAt < new Date())) return null;
  await prisma.userSession.update({
    where: { id: sessionId },
    data: { lastActiveAt: new Date(), expiresAt: new Date(Date.now() + THIRTY_DAYS_MS) },
  });
  return { userId: row.userId };
}

export async function revokeSession(sessionId: string) {
  await prisma.userSession.deleteMany({ where: { id: sessionId } });
}

export async function revokeAllSessions(userId: string) {
  await prisma.userSession.deleteMany({ where: { userId } });
}

// For the unfamiliar-country check: has this user logged in from this country before?
export async function isKnownCountry(userId: string, country: string | null): Promise<boolean> {
  if (!country) return true;
  const n = await prisma.userSession.count({ where: { userId, country } });
  return n > 0;
}
