import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function verifyEmailToken(rawToken: string): Promise<{ ok: boolean }> {
  const row = await prisma.emailVerification.findUnique({ where: { tokenHash: sha256(rawToken) } });
  if (!row || row.verifiedAt || row.expiresAt < new Date()) return { ok: false };
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerification.update({ where: { id: row.id }, data: { verifiedAt: new Date() } }),
  ]);
  return { ok: true };
}
