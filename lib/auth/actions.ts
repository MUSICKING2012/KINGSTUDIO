'use server';
import { signIn } from '@/auth';
import { registerUser } from './signup';

export async function signupAction(input: { email: string; password: string; name: string }) {
  const r = await registerUser(input);
  if (!r.ok) return r;
  await signIn('credentials', { email: input.email, password: input.password, redirect: false }); // auto-login
  return { ok: true as const };
}
