'use server';
import { auth, signIn, signOut } from '@/auth';
import { registerUser } from './signup';
import { revokeAllSessions } from './session';

export async function signupAction(input: { email: string; password: string; name: string }) {
  const r = await registerUser(input);
  if (!r.ok) return r;
  await signIn('credentials', { email: input.email, password: input.password, redirect: false }); // auto-login
  return { ok: true as const };
}

export async function loginAction(input: { email: string; password: string }) {
  try {
    await signIn('credentials', { ...input, redirect: false });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: 'error' };
  }
}

export async function logoutAction(scope: 'one' | 'all') {
  if (scope === 'all') {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (userId) await revokeAllSessions(userId);
  }
  await signOut({ redirectTo: '/login' });
}
