import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { Price } from '@/components/price/price';
import { Button } from '@/components/ui/button';
import { isPackageBookableOnline, isPackageViewable } from '@/lib/catalog/package-visibility';
import { computePackageTotal } from '@/lib/catalog/pricing';
import { getPackageBySlug } from '@/lib/catalog/queries';
import { LOCALE_DEFAULT_CURRENCY } from '@/lib/currency/config';
import { CURRENCY_COOKIE, parseCurrencyOverride } from '@/lib/currency/cookie';
import { getExchangeRates } from '@/lib/exchange/cache';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

// Editorial package detail (KING_STUDIO_DESIGN.md). Prices live in the DB (CLAUDE.md §6) — the
// per-headcount table is computed from the DB row at request time (force-dynamic). Copy
// (name/tagline/concept/includes) from messages/*.json packages.items[slug]. Locale exposure via
// isPackageViewable (languagesAvailable, CLAUDE.md §5) → notFound for hidden packages.
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
    <main className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
      {/* Back */}
      <Link
        href="/packages"
        className="inline-flex items-center gap-stack-sm text-label-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← {t('catalog.title')}
      </Link>

      <div className="mt-stack-lg grid grid-cols-1 gap-section-gap lg:grid-cols-2">
        {/* Left: package info */}
        <div>
          <h1 className="font-display text-headline-xl font-light text-foreground md:text-display-lg-mobile">
            {item?.name}
          </h1>
          <p className="mt-stack-md text-body-lg text-muted-foreground">{item?.tagline}</p>
          <p className="mt-stack-lg text-body-md text-foreground">{item?.concept}</p>

          {/* Includes */}
          <div className="mt-section-gap">
            <h2 className="border-l-4 border-primary pl-4 font-display text-headline-lg text-foreground">
              {t('detail.includesTitle')}
            </h2>
            <ul className="mt-stack-lg space-y-stack-sm">
              {(item?.includes ?? []).map((line: string) => (
                <li
                  key={line}
                  className="flex items-start gap-stack-sm text-body-md text-foreground"
                >
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* Duration / headcount */}
          <div className="mt-stack-lg flex flex-wrap gap-stack-lg text-label-sm text-muted-foreground">
            <span>{t('catalog.durationLabel', { minutes: pkg.slotMinutes })}</span>
            <span>
              {t('catalog.headcountLabel', { min: pkg.headcountMin, max: pkg.headcountMax })}
            </span>
          </div>
        </div>

        {/* Right: pricing + CTA */}
        <div>
          <div className="rounded-brand-card border border-border bg-card p-stack-lg">
            <h2 className="font-display text-headline-lg text-foreground">
              {t('detail.priceTableTitle')}
            </h2>

            <table className="mt-stack-md w-full text-body-md">
              <tbody>
                {headcounts.map((n) => {
                  const result = computePackageTotal(pkg, n);
                  return (
                    <tr key={n} className="border-b border-border last:border-0">
                      <td className="py-stack-sm text-muted-foreground">
                        {t('detail.perHeadcount', { n })}
                      </td>
                      <td className="py-stack-sm text-right font-semibold text-foreground">
                        <Price
                          amountKrw={result.totalKrw}
                          currency={currency}
                          intlLocale={locale}
                          rates={rates}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {isPackageBookableOnline(pkg) ? (
              <Button
                asChild
                size="lg"
                className="mt-stack-lg w-full bg-foreground text-background hover:bg-foreground/90"
              >
                <Link href={`/booking?package=${slug}`}>{t('detail.bookCta')}</Link>
              </Button>
            ) : (
              // b2b_quote (PRD §5.3 group exception): no self-serve booking — route to B2B
              // inquiry email instead (§5.8-A③ quote flow). Interim mailto CTA until the
              // dedicated B2B inquiry page (PRD IA) ships; subject uses the canonical DB name
              // for staff-side inbox filtering.
              <Button
                asChild
                size="lg"
                className="mt-stack-lg w-full bg-foreground text-background hover:bg-foreground/90"
              >
                <a
                  href={`mailto:join@kingstudio.co.kr?subject=${encodeURIComponent(`[B2B] ${pkg.name}`)}`}
                >
                  {t('detail.b2bInquiryCta')}
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
