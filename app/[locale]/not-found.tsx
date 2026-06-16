import { useTranslations } from 'next-intl';

// Localized 404 rendered inside the [locale] layout (has NextIntlClientProvider).
export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="text-muted-foreground">{t('description')}</p>
    </main>
  );
}
