import { prisma } from '@/lib/db/prisma';
import type { ReauthActionType } from '@prisma/client';
import { verifyPassword } from '@/lib/auth/password';
import { decryptSecret } from './crypto';
import { verifyTotp } from './totp';
import { AUTH_METHOD } from './constants';

// Re-auth foundation (CLAUDE.md §3.8). Sensitive actions call this; on success a verified
// reauth_challenges row is written. Wiring into each action happens with that feature.
export async function createReauthChallenge(adminUserId: string, actionType: ReauthActionType, targetId?: string) {
  return prisma.reauthChallenge.create({ data: { adminUserId, actionType, targetId: targetId ?? null } });
}

export async function verifyReauth(
  adminUserId: string, actionType: ReauthActionType, password: string, totp: string, targetId?: string,
): Promise<{ ok: boolean }> {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminUserId } });
  if (!admin?.passwordHash || !admin.totpSecret) return { ok: false };
  if (!(await verifyPassword(password, admin.passwordHash))) return { ok: false };
  if (!verifyTotp(decryptSecret(admin.totpSecret), totp)) return { ok: false };
  await prisma.reauthChallenge.create({
    data: { adminUserId, actionType, targetId: targetId ?? null, verifiedAt: new Date(), verificationMethod: AUTH_METHOD.PASSWORD_TOTP },
  });
  return { ok: true };
}
