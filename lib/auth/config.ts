import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { headers } from 'next/headers';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db/prisma';
import { loginSchema } from '@/lib/validations/auth';
import { verifyPassword } from './password';
import { metaFromHeaders } from './device';
import { createSession, validateSession, isKnownCountry } from './session';
import { sendEmail } from '@/lib/email/send';

const providers = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (!user?.passwordHash) return null;
      if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, email: user.email, name: user.name };
    },
  }),
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET, allowDangerousEmailAccountLinking: true })]
    : []),
];

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const meta = metaFromHeaders(await headers());
        if (!(await isKnownCountry(user.id, meta.country))) {
          await sendEmail({
            to: user.email!,
            subject: 'KING STUDIO – New sign-in location',
            text: `A new sign-in from ${meta.country ?? 'unknown'} (${meta.ip ?? 'n/a'}).`,
          });
        }
        const { sessionId } = await createSession(user.id, meta);
        token.userId = user.id;
        token.sessionId = sessionId;
      } else if (token.sessionId) {
        const ok = await validateSession(token.sessionId as string);
        if (!ok) { token.userId = undefined; token.sessionId = undefined; }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        (session.user as { id?: string }).id = token.userId as string;
        (session as { sessionId?: string }).sessionId = token.sessionId as string;
      }
      return session;
    },
  },
};
