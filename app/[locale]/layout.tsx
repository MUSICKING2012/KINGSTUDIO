import '@/app/globals.css';
import { type Locale, locales, routing } from '@/lib/i18n/routing';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Anton } from 'next/font/google';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';

// Stitch design-system fonts, self-hosted via next/font (no external runtime fetch).
// Pretendard = body/UI (KR·EN·JP·CN coverage); Anton = condensed headlines.
// Exposed as CSS variables; Tailwind fontFamily (sans / headline) maps to them.
const pretendard = localFont({
  src: '../fonts/PretendardVariable.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-pretendard',
});
const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-anton',
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
    <html lang={locale} className={`${pretendard.variable} ${anton.variable}`}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
