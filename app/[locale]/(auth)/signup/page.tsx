import { SignupForm } from '@/components/auth/signup-form';
import { Link } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export default function SignupPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = useTranslations('auth.signup');
  return (
    <main className="container mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6">
      <h1 className="text-center text-2xl font-bold">{t('title')}</h1>
      <SignupForm />
      <Link href="/login" className="text-center text-sm underline">
        {t('toLogin')}
      </Link>
    </main>
  );
}
