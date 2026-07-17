import '@/app/globals.css';
import { SiteHeader } from '@/components/header/site-header';
import { type Locale, locales, routing } from '@/lib/i18n/routing';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';

// Editorial: Pretendard single typeface, self-hosted via next/font (no external runtime fetch).
// Pretendard = body/UI (KR·EN·JP·CN coverage).
// Exposed as CSS variables; Tailwind fontFamily (sans / headline) maps to them.
const pretendard = localFont({
  src: '../fonts/PretendardVariable.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-pretendard',
});

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
    <html lang={locale} className={pretendard.variable}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <SiteHeader />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
