import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { headers } from 'next/headers';
import { metaFromHeaders } from '@/lib/auth/device';
import { adminLoginSchema } from '@/lib/validations/admin-auth';
import { authenticateAdmin } from './authenticate';
import { createAdminSession, validateAdminSession } from './session';
import { ADMIN_SESSION_MAX_AGE_MS } from './constants';

const isProd = process.env.NODE_ENV === 'production';

export const adminAuthConfig: NextAuthConfig = {
  basePath: '/api/admin/auth',
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, totp: {} },
      async authorize(raw) {
        const parsed = adminLoginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const r = await authenticateAdmin(parsed.data.email, parsed.data.password, parsed.data.totp);
        return r.ok ? { id: r.adminUserId } : null;
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: ADMIN_SESSION_MAX_AGE_MS / 1000 },
  pages: { signIn: '/admin/login' },
  // Separate cookies so customer & admin sessions NEVER mix.
  cookies: {
    sessionToken: { name: 'authjs.admin-session-token', options: { httpOnly: true, sameSite: 'lax', path: '/', secure: isProd } },
    csrfToken: { name: 'authjs.admin-csrf-token', options: { httpOnly: true, sameSite: 'lax', path: '/', secure: isProd } },
    callbackUrl: { name: 'authjs.admin-callback-url', options: { sameSite: 'lax', path: '/', secure: isProd } },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const meta = metaFromHeaders(await headers());
        const { sessionId } = await createAdminSession(user.id, meta);
        token.adminUserId = user.id;
        token.sessionId = sessionId;
      } else if (token.sessionId) {
        const ok = await validateAdminSession(token.sessionId as string);
        if (!ok) {
          token.adminUserId = undefined;
          token.sessionId = undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.adminUserId) {
        (session.user as { id?: string }).id = token.adminUserId as string;
        (session as { sessionId?: string }).sessionId = token.sessionId as string;
      }
      return session;
    },
  },
};
