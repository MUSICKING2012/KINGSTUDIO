import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { authenticator } from 'otplib';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { encryptSecret } from './crypto';
import { authenticateAdmin } from './authenticate';
import { ADMIN_LOCKOUT_THRESHOLD } from './constants';

process.env.ADMIN_TOTP_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
const SECRET = authenticator.generateSecret();
let email: string;
beforeEach(async () => {
  email = `auth_${Date.now()}@test.local`;
  await prisma.adminUser.create({
    data: { email, name: 'A', passwordHash: await hashPassword('correcthorse12'), totpSecret: encryptSecret(SECRET), totpEnabled: true, status: 'active' },
  });
});
afterAll(async () => { await prisma.$disconnect(); });

describe('authenticateAdmin', () => {
  it('succeeds with pw + valid TOTP', async () => {
    const r = await authenticateAdmin(email, 'correcthorse12', authenticator.generate(SECRET));
    expect(r.ok).toBe(true);
  });
  it('fails on wrong password (generic)', async () => {
    expect((await authenticateAdmin(email, 'wrongwrong12', authenticator.generate(SECRET))).ok).toBe(false);
  });
  it('fails on wrong TOTP', async () => {
    expect((await authenticateAdmin(email, 'correcthorse12', '000000')).ok).toBe(false);
  });
  it('locks after threshold consecutive fails', async () => {
    for (let i = 0; i < ADMIN_LOCKOUT_THRESHOLD; i++) await authenticateAdmin(email, 'wrongwrong12', '000000');
    // even a correct attempt is now rejected (locked)
    const r = await authenticateAdmin(email, 'correcthorse12', authenticator.generate(SECRET));
    expect(r.ok).toBe(false);
    const u = await prisma.adminUser.findUniqueOrThrow({ where: { email } });
    expect(u.lockedUntil).toBeTruthy();
  });
  it('resets failure count on success', async () => {
    await authenticateAdmin(email, 'wrongwrong12', '000000');
    await authenticateAdmin(email, 'correcthorse12', authenticator.generate(SECRET));
    const u = await prisma.adminUser.findUniqueOrThrow({ where: { email } });
    expect(u.failedLoginCount).toBe(0);
  });
});
