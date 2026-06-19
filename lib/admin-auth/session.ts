import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import type { RequestMeta } from '@/lib/auth/device';
import { ADMIN_SESSION_MAX_AGE_MS, ADMIN_MAX_CONCURRENT_SESSIONS } from './constants';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function createAdminSession(adminUserId: string, meta: RequestMeta) {
  const rawToken = randomBytes(32).toString('hex');
  const row = await prisma.adminSession.create({
    data: {
      adminUserId,
      tokenHash: sha256(rawToken), // 🔒 hash only
      ip: meta.ip,
      country: meta.country,
      userAgent: meta.userAgent,
      expiresAt: new Date(Date.now() + ADMIN_SESSION_MAX_AGE_MS),
      lastActiveAt: new Date(),
    },
  });
  // Enforce max concurrent: keep the N newest, delete the rest (PRD 5.8 "oldest evicted").
  const sessions = await prisma.adminSession.findMany({
    where: { adminUserId }, orderBy: { lastActiveAt: 'desc' }, select: { id: true },
  });
  const stale = sessions.slice(ADMIN_MAX_CONCURRENT_SESSIONS).map((s) => s.id);
  if (stale.length) await prisma.adminSession.deleteMany({ where: { id: { in: stale } } });
  return { sessionId: row.id, rawToken };
}

export async function validateAdminSession(sessionId: string): Promise<{ adminUserId: string } | null> {
  const row = await prisma.adminSession.findUnique({ where: { id: sessionId } });
  if (!row || (row.expiresAt && row.expiresAt < new Date())) return null;
  await prisma.adminSession.update({
    where: { id: sessionId },
    data: { lastActiveAt: new Date(), expiresAt: new Date(Date.now() + ADMIN_SESSION_MAX_AGE_MS) },
  });
  return { adminUserId: row.adminUserId };
}

export async function revokeAdminSession(sessionId: string) {
  await prisma.adminSession.deleteMany({ where: { id: sessionId } });
}
export async function revokeAllAdminSessions(adminUserId: string) {
  await prisma.adminSession.deleteMany({ where: { adminUserId } });
}
