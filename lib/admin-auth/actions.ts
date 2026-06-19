'use server';
import { adminSignIn, adminSignOut } from '@/adminAuth';

export async function adminLoginAction(input: { email: string; password: string; totp: string }) {
  try {
    await adminSignIn('credentials', { ...input, redirect: false });
    return { ok: true as const };
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'digest' in err &&
      String((err as { digest?: unknown }).digest).startsWith('NEXT_REDIRECT')
    )
      throw err;
    return { ok: false as const };
  }
}

export async function adminLogoutAction() {
  await adminSignOut({ redirectTo: '/admin/login' });
}
