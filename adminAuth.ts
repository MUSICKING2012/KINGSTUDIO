import { adminAuthConfig } from '@/lib/admin-auth/config';
import NextAuth from 'next-auth';

export const {
  handlers: adminHandlers,
  auth: adminAuth,
  signIn: adminSignIn,
  signOut: adminSignOut,
} = NextAuth(adminAuthConfig);
