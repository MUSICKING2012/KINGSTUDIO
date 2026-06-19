import { adminAuth } from '@/adminAuth';
import { redirect } from 'next/navigation';

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await adminAuth();
  if (!(session?.user as { id?: string } | undefined)?.id) redirect('/admin/login');
  return <>{children}</>;
}
