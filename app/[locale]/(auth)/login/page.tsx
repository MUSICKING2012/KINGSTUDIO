import { LoginForm } from '@/components/auth/login-form';
import { Link } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export default function LoginPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = useTranslations('auth.login');
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  return (
    <main className="container mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6">
      <h1 className="text-center text-2xl font-bold">{t('title')}</h1>
      <LoginForm googleEnabled={googleEnabled} />
      <Link href="/signup" className="text-center text-sm underline">
        {t('toSignup')}
      </Link>
    </main>
  );
}
