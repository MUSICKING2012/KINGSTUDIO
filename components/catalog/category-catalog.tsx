import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { PackageComparison } from '@/components/catalog/package-comparison';
import { Price } from '@/components/price/price';
import { Button } from '@/components/ui/button';
import { buildComparison } from '@/lib/catalog/comparison';
import { computePackageTotal } from '@/lib/catalog/pricing';
import { listPackages } from '@/lib/catalog/queries';
import { LOCALE_DEFAULT_CURRENCY } from '@/lib/currency/config';
import { CURRENCY_COOKIE, parseCurrencyOverride } from '@/lib/currency/cookie';
import { getExchangeRates } from '@/lib/exchange/cache';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type { PackageCategory } from '@prisma/client';

// Editorial single-category catalog (KING_STUDIO_DESIGN.md), shared by the /experience /rental /group
// routes (CategoryIA refactor). Prices live in the DB (CLAUDE.md §6); the caller route is
// force-dynamic so this reads packages + display FX at request time. Descriptive copy (name/tagline)
// comes from messages/*.json packages.items keyed by slug; heading/subtitle from packages.catalog
// .categories.<category>; money/headcount/duration from the DB. Locale exposure is handled by
// listPackages (languagesAvailable filter, CLAUDE.md §5) — a category with no locale-visible
// packages 404s below (data-driven gate, no hardcoded category→locale allow-list).
export async function CategoryCatalog({
  category,
  locale,
}: {
  category: PackageCategory;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: 'packages' });

  const prismaLocale = toPrismaLocale(locale as Locale);
  const all = await listPackages({ locale: prismaLocale });
  const pkgs = all.filter((p) => p.category === category);
  // Data-driven exposure gate: e.g. /rental in en — 1Hour/1Pro are ko-only, so pkgs is empty → 404.
  if (pkgs.length === 0) notFound();

  // 표시 전용 환율. 실패 시 null → KRW 단독 표기 강등(카테고리 페이지가 환율 장애로 죽으면 안 됨).
  const rates = await getExchangeRates().catch((e) => {
    console.error('[packages/catalog] exchange rate fetch failed, KRW-only fallback:', e);
    return null;
  });
  // ④-b 오버라이드 체인: 쿠키 ?? 로케일 기본. cookies()는 force-dynamic 라우트라 렌더 모드 영향 없음.
  const currencyOverride = parseCurrencyOverride(cookies().get(CURRENCY_COOKIE)?.value);
  const currency = currencyOverride ?? LOCALE_DEFAULT_CURRENCY[locale as Locale];

  type PkgItem = { name: string; tagline: string; concept: string; includes: string[] };
  const pkgItems = t.raw('items') as Record<string, PkgItem>;

  return (
    <main className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
      {/* Header */}
      <header className="max-w-3xl">
        <h1 className="font-display text-headline-xl font-light text-foreground md:text-display-lg-mobile">
          {t(`catalog.categories.${category}.heading`)}
        </h1>
        <p className="mt-stack-md text-body-lg text-muted-foreground">
          {t(`catalog.categories.${category}.subtitle`)}
        </p>
      </header>

      <section className="mt-section-gap">
        <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
          {pkgs.map((pkg) => {
            const fromPrice = computePackageTotal(pkg, pkg.headcountMin).totalKrw;
            const slug = pkg.slug;
            return (
              <article
                key={pkg.id}
                className="flex flex-col rounded-brand-card border border-border bg-card p-stack-lg"
              >
                <h3 className="font-display text-headline-lg text-foreground">
                  {pkgItems[slug]?.name}
                </h3>
                <p className="mt-stack-sm text-body-md text-muted-foreground">
                  {pkgItems[slug]?.tagline}
                </p>

                <div className="mt-stack-md flex flex-wrap gap-stack-sm text-label-sm text-muted-foreground">
                  <span>{t('catalog.durationLabel', { minutes: pkg.slotMinutes })}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t('catalog.headcountLabel', {
                      min: pkg.headcountMin,
                      max: pkg.headcountMax,
                    })}
                  </span>
                </div>

                <p className="mt-stack-md text-body-lg font-semibold text-foreground">
                  <Price
                    amountKrw={fromPrice}
                    currency={currency}
                    intlLocale={locale}
                    rates={rates}
                  />{' '}
                  <span className="text-label-sm font-normal text-muted-foreground">
                    {t('catalog.fromLabel')}
                  </span>
                </p>

                <div className="mt-auto pt-stack-lg">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/packages/${slug}`}>{t('catalog.viewDetail')}</Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
        {category === 'experience' && (
          <>
            <PackageComparison locale={locale} columns={buildComparison(pkgs)} />
            <p className="mt-stack-md text-label-sm text-muted-foreground">
              {t('catalog.krwNotice')}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
