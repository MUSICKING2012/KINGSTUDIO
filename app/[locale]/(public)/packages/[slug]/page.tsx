import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import Link from 'next/link';

import { Surface } from '@/components/ui/surface';
import { getPackageBySlug } from '@/lib/catalog/queries';
import { isPackageViewable } from '@/lib/catalog/package-visibility';
import { computePackageTotal } from '@/lib/catalog/pricing';
import { getExchangeRates } from '@/lib/exchange/cache';
import { LOCALE_DEFAULT_CURRENCY } from '@/lib/currency/config';
import { CURRENCY_COOKIE, parseCurrencyOverride } from '@/lib/currency/cookie';
import { Price } from '@/components/price/price';
import { toPrismaLocale } from '@/lib/i18n/locale';
import type { Locale } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';

// generateMetadata + page component each need the package — cache() dedupes to 1 DB read.
const loadPackage = cache((slug: string) => getPackageBySlug(slug));

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const pkg = await loadPackage(slug);
  const prismaLocale = toPrismaLocale(locale as Locale);
  if (!isPackageViewable(pkg, prismaLocale)) return {};
  const t = await getTranslations({ locale, namespace: 'packages' });
  type PkgItem = { name: string; tagline: string; concept: string; includes: string[] };
  const pkgItems = t.raw('items') as Record<string, PkgItem>;
  return {
    title: pkgItems[slug]?.name ?? slug,
    description: pkgItems[slug]?.tagline,
  };
}

export default async function PackageDetailPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  setRequestLocale(locale);

  const pkg = await loadPackage(slug);
  const prismaLocale = toPrismaLocale(locale as Locale);

  if (!isPackageViewable(pkg, prismaLocale)) notFound();

  const t = await getTranslations({ locale, namespace: 'packages' });
  // 표시 전용 환율. 실패 시 null → KRW 단독 표기 강등.
  const rates = await getExchangeRates().catch((e) => {
    console.error('[packages/detail] exchange rate fetch failed, KRW-only fallback:', e);
    return null;
  });
  // ④-b 오버라이드 체인: 쿠키 ?? 로케일 기본. cookies()는 force-dynamic 페이지라 렌더 모드 영향 없음.
  const currencyOverride = parseCurrencyOverride(cookies().get(CURRENCY_COOKIE)?.value);
  const currency = currencyOverride ?? LOCALE_DEFAULT_CURRENCY[locale as Locale];

  type PkgItem = { name: string; tagline: string; concept: string; includes: string[] };
  const pkgItems = t.raw('items') as Record<string, PkgItem>;
  const item = pkgItems[slug];

  // 인원별 요금 테이블 (headcountMin ~ headcountMax)
  const headcounts = Array.from(
    { length: pkg.headcountMax - pkg.headcountMin + 1 },
    (_, i) => pkg.headcountMin + i,
  );

  return (
    <Surface tone="warm">
      <main className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop py-section-gap">
        {/* 뒤로가기 */}
        <Link
          href={`/${locale}/packages`}
          className="mb-stack-lg inline-flex items-center gap-stack-sm text-label-sm text-muted-text hover:text-surface-cinematic transition-colors"
        >
          ← {t('catalog.title')}
        </Link>

        <div className="grid grid-cols-1 gap-section-gap lg:grid-cols-2">
          {/* 왼쪽: 패키지 정보 */}
          <div>
            <h1 className="font-display text-headline-xl text-surface-cinematic">
              {item?.name}
            </h1>
            <p className="mt-stack-md text-body-lg text-muted-text">
              {item?.tagline}
            </p>

            <p className="mt-stack-lg text-body-md text-on-surface">
              {item?.concept}
            </p>

            {/* 포함 항목 */}
            <div className="mt-stack-lg">
              <h2 className="mb-stack-md border-l-4 border-brand-primary pl-4 text-body-lg font-bold text-surface-cinematic">
                {t('detail.includesTitle')}
              </h2>
              <ul className="space-y-stack-sm">
                {(item?.includes ?? []).map(
                  (item: string, i: number) => (
                    <li key={i} className="flex items-start gap-stack-sm text-body-md text-on-surface">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-primary" aria-hidden="true" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* 소요 시간 / 인원 */}
            <div className="mt-stack-lg flex gap-stack-lg text-body-md text-muted-text">
              <span>{t('catalog.durationLabel', { minutes: pkg.slotMinutes })}</span>
              <span>
                {t('catalog.headcountLabel', {
                  min: pkg.headcountMin,
                  max: pkg.headcountMax,
                })}
              </span>
            </div>
          </div>

          {/* 오른쪽: 요금 + CTA */}
          <div>
            <div className="rounded-brand-card border border-outline/20 bg-white p-stack-lg shadow-sm">
              <h2 className="mb-stack-md text-body-lg font-bold text-surface-cinematic">
                {t('detail.priceTableTitle')}
              </h2>

              <table className="w-full text-body-md">
                <tbody>
                  {headcounts.map((n) => {
                    const result = computePackageTotal(pkg, n);
                    return (
                      <tr key={n} className="border-b border-outline/10 last:border-0">
                        <td className="py-stack-sm text-muted-text">
                          {t('detail.perHeadcount', { n })}
                        </td>
                        <td className="py-stack-sm text-right font-semibold text-surface-cinematic">
                          <Price amountKrw={result.totalKrw} currency={currency} intlLocale={locale} rates={rates} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <Link
                href={`/${locale}/booking?package=${slug}`}
                className="mt-stack-lg block w-full rounded-brand-input bg-brand-primary py-3 text-center text-body-md font-bold text-white hover:opacity-90 transition-opacity"
              >
                {t('detail.bookCta')}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </Surface>
  );
}
