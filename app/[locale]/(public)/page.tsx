import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

export default function HomePage({ params }: { params: { locale: string } }) {
  // Static rendering opt-in for this page.
  setRequestLocale(params.locale);

  const t = useTranslations('home');

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground">{t('subtitle')}</p>
    </main>
  );
}
