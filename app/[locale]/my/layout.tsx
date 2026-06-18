import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function MyLayout({
  children,
  params,
}: { children: React.ReactNode; params: { locale: string } }) {
  const session = await auth();
  if (!session?.user) redirect(`/${params.locale}/login`);
  return <>{children}</>;
}
