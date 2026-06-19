import NextAuth from 'next-auth';
import { adminAuthConfig } from '@/lib/admin-auth/config';

export const { handlers: adminHandlers, auth: adminAuth, signIn: adminSignIn, signOut: adminSignOut } = NextAuth(adminAuthConfig);
