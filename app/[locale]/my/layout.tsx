import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function MyLayout({
  children,
  params,
}: { children: React.ReactNode; params: { locale: string } }) {
  const session = await auth();
  if (!session?.user) redirect(`/${params.locale}/login`);
  return <>{children}</>;
}
