import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { decryptSecret } from './crypto';
import { verifyTotp } from './totp';
import { ADMIN_LOCKOUT_THRESHOLD, ADMIN_LOCKOUT_MS } from './constants';

type Result = { ok: true; adminUserId: string } | { ok: false };

// Security-critical core (unit-tested). Generic failure — never reveals which factor failed
// or whether the email exists. Lockout: 5 consecutive fails → 30-min lock; success resets.
export async function authenticateAdmin(email: string, password: string, totp: string): Promise<Result> {
  const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!admin || admin.status !== 'active') return { ok: false };
  if (admin.lockedUntil && admin.lockedUntil > new Date()) return { ok: false };

  const pwOk = admin.passwordHash ? await verifyPassword(password, admin.passwordHash) : false;
  const totpOk = pwOk && admin.totpSecret ? verifyTotp(decryptSecret(admin.totpSecret), totp) : false;

  if (!pwOk || !totpOk) {
    const count = admin.failedLoginCount + 1;
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        failedLoginCount: count,
        lockedUntil: count >= ADMIN_LOCKOUT_THRESHOLD ? new Date(Date.now() + ADMIN_LOCKOUT_MS) : admin.lockedUntil,
      },
    });
    return { ok: false };
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  return { ok: true, adminUserId: admin.id };
}
