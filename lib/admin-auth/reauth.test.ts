import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { authenticator } from 'otplib';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { encryptSecret } from './crypto';
import { verifyReauth } from './reauth';

process.env.ADMIN_TOTP_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
const SECRET = authenticator.generateSecret();
let adminId: string;
beforeEach(async () => {
  await prisma.reauthChallenge.deleteMany();
  await prisma.adminUser.deleteMany({ where: { email: 'reauth@test.local' } });
  const a = await prisma.adminUser.create({
    data: { email: 'reauth@test.local', name: 'A', passwordHash: await hashPassword('correcthorse12'), totpSecret: encryptSecret(SECRET), totpEnabled: true },
  });
  adminId = a.id;
});
afterAll(async () => { await prisma.$disconnect(); });

describe('verifyReauth', () => {
  it('verifies pw + TOTP and writes a challenge row', async () => {
    const r = await verifyReauth(adminId, 'refund', 'correcthorse12', authenticator.generate(SECRET));
    expect(r.ok).toBe(true);
    const row = await prisma.reauthChallenge.findFirstOrThrow({ where: { adminUserId: adminId } });
    expect(row.verifiedAt).toBeTruthy();
    expect(row.verificationMethod).toBe('password+totp');
    expect(row.actionType).toBe('refund');
  });
  it('rejects wrong TOTP (no verified row)', async () => {
    const r = await verifyReauth(adminId, 'refund', 'correcthorse12', '000000');
    expect(r.ok).toBe(false);
  });
});
