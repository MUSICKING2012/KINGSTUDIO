import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { Surface } from '@/components/ui/surface';
import { listPackages } from '@/lib/catalog/queries';
import { computePackageTotal } from '@/lib/catalog/pricing';
import { getExchangeRates } from '@/lib/exchange/cache';
import { Price } from '@/components/price/price';
import { toPrismaLocale } from '@/lib/i18n/locale';
import type { Locale } from '@/lib/i18n/routing';
import type { PackageCategory } from '@prisma/client';

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
    <Surface tone="warm">
      <main className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop py-section-gap">
        {/* 헤더 */}
        <div className="mb-stack-lg text-center">
          <h1 className="font-display text-headline-xl text-surface-cinematic">
            {t('catalog.title')}
          </h1>
          <p className="mt-stack-md text-body-lg text-muted-text">{t('catalog.subtitle')}</p>
        </div>

        {/* 카테고리별 섹션 */}
        {CATEGORY_ORDER.map((cat) => {
          const pkgs = byCategory[cat];
          if (pkgs.length === 0) return null;
          return (
            <section key={cat} className="mb-section-gap">
              <h2 className="mb-stack-lg border-l-4 border-brand-primary pl-4 text-body-lg font-bold text-surface-cinematic">
                {sectionLabel[cat]}
              </h2>
              <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
                {pkgs.map((pkg) => {
                  const fromPrice = computePackageTotal(pkg, pkg.headcountMin).totalKrw;
                  const slug = pkg.slug;
                  return (
                    <article
                      key={pkg.id}
                      className="flex flex-col rounded-brand-card bg-white shadow-sm border border-outline/20 overflow-hidden"
                    >
                      <div className="flex-1 p-stack-lg">
                        <h3 className="text-body-lg font-bold text-surface-cinematic">
                          {pkgItems[slug]?.name}
                        </h3>
                        <p className="mt-stack-sm text-body-md text-muted-text">
                          {pkgItems[slug]?.tagline}
                        </p>

                        <div className="mt-stack-md flex flex-wrap gap-stack-sm text-label-sm text-muted-text">
                          <span>
                            {t('catalog.durationLabel', { minutes: pkg.slotMinutes })}
                          </span>
                          <span>·</span>
                          <span>
                            {t('catalog.headcountLabel', {
                              min: pkg.headcountMin,
                              max: pkg.headcountMax,
                            })}
                          </span>
                        </div>

                        <p className="mt-stack-md text-body-md font-semibold text-surface-cinematic">
                          <Price amountKrw={fromPrice} locale={locale as Locale} rates={rates} />{' '}
                          <span className="text-label-sm font-normal text-muted-text">
                            {t('catalog.fromLabel')}
                          </span>
                        </p>
                      </div>

                      <div className="border-t border-outline/20 p-stack-md">
                        <Link
                          href={`/${locale}/packages/${slug}`}
                          className="block w-full rounded-brand-input bg-brand-primary py-2 text-center text-label-sm font-bold text-white hover:opacity-90 transition-opacity"
                        >
                          {t('catalog.viewDetail')}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </Surface>
  );
}
