import { getTranslations, setRequestLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { logoutAction } from '@/lib/auth/actions';
import { VerifyBanner } from '@/components/auth/verify-banner';
import { Button } from '@/components/ui/button';

export default async function MyPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('auth.my');
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  return (
    <>
      <VerifyBanner verified={Boolean(user?.emailVerified)} />
      <main className="container mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{user?.email}</p>
        <form action={async () => { 'use server'; await logoutAction('one'); }}>
          <Button type="submit" variant="outline" className="w-full">{t('logout')}</Button>
        </form>
        <form action={async () => { 'use server'; await logoutAction('all'); }}>
          <Button type="submit" variant="destructive" className="w-full">{t('logoutAll')}</Button>
        </form>
      </main>
    </>
  );
}
