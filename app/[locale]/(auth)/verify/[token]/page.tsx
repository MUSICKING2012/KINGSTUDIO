import { verifyEmailToken } from '@/lib/auth/verify';
import { Link } from '@/lib/i18n/navigation';
import { getTranslations } from 'next-intl/server';

export default async function VerifyPage({ params }: { params: { token: string } }) {
  const t = await getTranslations('auth.verify');
  const { ok } = await verifyEmailToken(params.token);
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold">{ok ? t('successTitle') : t('failTitle')}</h1>
      <p className="text-muted-foreground">{ok ? t('successBody') : t('failBody')}</p>
      <Link href="/my" className="underline">
        {t('cta')}
      </Link>
    </main>
  );
}
