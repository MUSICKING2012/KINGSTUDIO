import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';

import { Price } from '@/components/price/price';
import { Button } from '@/components/ui/button';
import { computePackageTotal } from '@/lib/catalog/pricing';
import { listPackages } from '@/lib/catalog/queries';
import { LOCALE_DEFAULT_CURRENCY } from '@/lib/currency/config';
import { CURRENCY_COOKIE, parseCurrencyOverride } from '@/lib/currency/cookie';
import { getExchangeRates } from '@/lib/exchange/cache';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type { PackageCategory } from '@prisma/client';

// Editorial catalog (KING_STUDIO_DESIGN.md). Prices live in the DB (CLAUDE.md §6) — this page is
// force-dynamic and reads packages + display FX at request time. Descriptive copy (name/tagline)
// comes from messages/*.json packages.items keyed by slug; money/headcount/duration from the DB.
// Locale exposure is handled by listPackages (languagesAvailable filter, CLAUDE.md §5).
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'packages.catalog' });
  return { title: t('title'), description: t('subtitle') };
}

const CATEGORY_ORDER: PackageCategory[] = ['experience', 'rental', 'group'];

export default async function PackageCatalogPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'packages' });

  const prismaLocale = toPrismaLocale(locale as Locale);
  const packages = await listPackages({ locale: prismaLocale });
  // 표시 전용 환율. 실패 시 null → KRW 단독 표기 강등(패키지 페이지가 환율 장애로 죽으면 안 됨).
  const rates = await getExchangeRates().catch((e) => {
    console.error('[packages/catalog] exchange rate fetch failed, KRW-only fallback:', e);
    return null;
  });
  // ④-b 오버라이드 체인: 쿠키 ?? 로케일 기본. cookies()는 force-dynamic 페이지라 렌더 모드 영향 없음.
  const currencyOverride = parseCurrencyOverride(cookies().get(CURRENCY_COOKIE)?.value);
  const currency = currencyOverride ?? LOCALE_DEFAULT_CURRENCY[locale as Locale];

  const byCategory = CATEGORY_ORDER.reduce<Record<PackageCategory, typeof packages>>(
    (acc, cat) => {
      acc[cat] = packages.filter((p) => p.category === cat);
      return acc;
    },
    { experience: [], rental: [], group: [] },
  );

  type PkgItem = { name: string; tagline: string; concept: string; includes: string[] };
  const pkgItems = t.raw('items') as Record<string, PkgItem>;

  const sectionLabel: Record<PackageCategory, string> = {
    experience: t('catalog.sectionExperience'),
    rental: t('catalog.sectionRental'),
    group: t('catalog.sectionGroup'),
  };

  return (
    <main className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
      {/* Header */}
      <header className="max-w-3xl">
        <h1 className="font-display text-headline-xl font-light text-foreground md:text-display-lg-mobile">
          {t('catalog.title')}
        </h1>
        <p className="mt-stack-md text-body-lg text-muted-foreground">{t('catalog.subtitle')}</p>
      </header>

      {/* Category sections */}
      {CATEGORY_ORDER.map((cat) => {
        const pkgs = byCategory[cat];
        if (pkgs.length === 0) return null;
        return (
          <section key={cat} className="mt-section-gap">
            <h2 className="border-l-4 border-primary pl-4 font-display text-headline-lg text-foreground">
              {sectionLabel[cat]}
            </h2>
            <div className="mt-stack-lg grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
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
          </section>
        );
      })}
    </main>
  );
}
