import '@/app/globals.css';
import { type Locale, locales, routing } from '@/lib/i18n/routing';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'KING STUDIO',
  description: 'K-POP recording experience in Seoul.',
};

// Pre-render every locale at build time (static generation).
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Reject unknown locales before rendering.
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering for this request's locale.
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
