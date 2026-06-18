import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { verifyEmailToken } from './verify';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
let userId: string;
let raw: string;
beforeEach(async () => {
  await prisma.emailVerification.deleteMany();
  await prisma.user.deleteMany({ where: { email: 'v@test.local' } });
  const u = await prisma.user.create({ data: { email: 'v@test.local' } });
  userId = u.id;
  raw = randomBytes(16).toString('hex');
  await prisma.emailVerification.create({
    data: { userId, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 3600_000) },
  });
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('verifyEmailToken', () => {
  it('verifies a valid token and stamps emailVerified', async () => {
    expect((await verifyEmailToken(raw)).ok).toBe(true);
    expect((await prisma.user.findUnique({ where: { id: userId } }))?.emailVerified).toBeTruthy();
  });
  it('rejects an unknown token', async () => {
    expect((await verifyEmailToken('deadbeef')).ok).toBe(false);
  });
  it('rejects an expired token', async () => {
    await prisma.emailVerification.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await verifyEmailToken(raw)).ok).toBe(false);
  });
});
