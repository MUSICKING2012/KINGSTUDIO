'use server';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email/send';
import { signupSchema } from '@/lib/validations/auth';
import { hashPassword, isPwned, isStrong } from './password';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
type Result = { ok: true; userId: string } | { ok: false; error: string };

// `_pwnedForTest` lets tests force the HIBP branch without network.
export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  _pwnedForTest?: boolean;
}): Promise<Result> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const { email, password, name } = parsed.data;

  if (input._pwnedForTest || (await isPwned(password)))
    return { ok: false, error: 'password.pwned' };
  if (!isStrong(password).ok) return { ok: false, error: 'password.weak' };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: 'email.taken' };

  const user = await prisma.user.create({
    data: { email, name, passwordHash: await hashPassword(password) },
  });

  const rawToken = randomBytes(32).toString('hex');
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      tokenHash: sha256(rawToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/en/verify/${rawToken}`;
  await sendEmail({
    to: email,
    subject: 'KING STUDIO – Verify your email',
    text: `Verify: ${url}`,
  });

  return { ok: true, userId: user.id };
}
