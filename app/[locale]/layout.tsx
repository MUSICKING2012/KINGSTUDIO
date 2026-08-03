import '@/app/globals.css';
import '@/app/fonts/pretendard-dynamic-subset.css';
import { SiteFooter } from '@/components/footer/site-footer';
import { SiteHeader } from '@/components/header/site-header';
import { type Locale, locales, routing } from '@/lib/i18n/routing';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Editorial: Pretendard single typeface, self-hosted (no external runtime fetch — CLAUDE 원칙).
// 배포판 = 공식 dynamic-subset(v1.3.9, OFL): 92개 unicode-range 청크로 쪼개진 가변 woff2 를
// vendored CSS(@font-face × 92, font-display: swap)로 서빙한다. 브라우저는 실제 렌더에 쓰인
// 글리프의 청크만 내려받는다 — 구 단일 PretendardVariable.woff2(2,057,688B, 전체 CJK 글리프
// preload)가 시뮬레이션 LCP ~2.1s(Gate 3 성능 88–90 경계)의 유일 병목이라 교체(2026-08-03).
// next/font localFont 는 unicode-range 다중 청크를 표현할 수 없어 쓰지 않는다. tailwind 가
// 소비하는 --font-pretendard 변수는 vendored CSS 말미의 :root 정의가 제공한다.

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
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <SiteHeader locale={locale} />
          {children}
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
