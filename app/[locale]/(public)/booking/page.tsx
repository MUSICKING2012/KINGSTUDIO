import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';

import { BookingProgress } from '@/components/booking/booking-progress';
import { Price } from '@/components/price/price';
import { computePackageTotal } from '@/lib/catalog/pricing';
import { listPackages } from '@/lib/catalog/queries';
import { LOCALE_DEFAULT_CURRENCY } from '@/lib/currency/config';
import { CURRENCY_COOKIE, parseCurrencyOverride } from '@/lib/currency/cookie';
import { getExchangeRates } from '@/lib/exchange/cache';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { resolvePackageTier } from '@/lib/slots/publicAvailability';

// Booking Step 1 — package selection (PRD §5.3 4-step flow). Read-only. Only self-serve
// slot-grid packages are bookable here: listPackages already applies the languagesAvailable
// gate (C11, ko-only rental hides abroad), then we drop group/b2b packages that have no slot
// grid (resolvePackageTier → null). Copy (name/tagline) reuses the packages namespace so there
// is a single translation source; money/duration/headcount come from the DB row.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'booking.step1' });
  return { title: t('title'), description: t('subtitle') };
}

export default async function BookingStep1Page({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'booking' });
  const tp = await getTranslations({ locale, namespace: 'packages' });

  const prismaLocale = toPrismaLocale(locale as Locale);
  const bookable = (await listPackages({ locale: prismaLocale })).filter(
    (p) => resolvePackageTier(p.name) !== null,
  );

  // Display-only FX (same pattern as the packages catalog). Failure → KRW-only, never fatal.
  const rates = await getExchangeRates().catch((e) => {
    console.error('[booking/step1] exchange rate fetch failed, KRW-only fallback:', e);
    return null;
  });
  const currencyOverride = parseCurrencyOverride(cookies().get(CURRENCY_COOKIE)?.value);
  const currency = currencyOverride ?? LOCALE_DEFAULT_CURRENCY[locale as Locale];

  type PkgItem = { name: string; tagline: string };
  const pkgItems = tp.raw('items') as Record<string, PkgItem>;

  const progressLabels = {
    aria: t('progress.aria', { current: 1, total: 4 }),
    step1: t('progress.step1'),
    step2: t('progress.step2'),
    step3: t('progress.step3'),
    step4: t('progress.step4'),
  };

  return (
    <main className="mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop">
      <BookingProgress current={1} labels={progressLabels} />

      <header className="mt-section-gap max-w-3xl">
        <h1 className="font-display text-headline-xl font-light text-foreground md:text-display-lg-mobile">
          {t('step1.title')}
        </h1>
        <p className="mt-stack-md text-body-lg text-muted-foreground">{t('step1.subtitle')}</p>
      </header>

      {bookable.length === 0 ? (
        <p className="mt-section-gap text-body-md text-muted-foreground">{t('step1.empty')}</p>
      ) : (
        <div className="mt-stack-lg grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
          {bookable.map((pkg) => {
            const fromPrice = computePackageTotal(pkg, pkg.headcountMin).totalKrw;
            return (
              <article
                key={pkg.id}
                className="flex flex-col rounded-brand-card border border-border bg-card p-stack-lg"
              >
                <h2 className="font-display text-headline-lg text-foreground">
                  {pkgItems[pkg.slug]?.name ?? pkg.name}
                </h2>
                <p className="mt-stack-sm text-body-md text-muted-foreground">
                  {pkgItems[pkg.slug]?.tagline}
                </p>

                <div className="mt-stack-md flex flex-wrap gap-stack-sm text-label-sm text-muted-foreground">
                  <span>{t('step1.durationLabel', { minutes: pkg.slotMinutes })}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t('step1.headcountLabel', {
                      min: pkg.headcountMin,
                      max: pkg.headcountMax,
                    })}
                  </span>
                </div>

                <p className="mt-stack-md text-body-lg font-semibold text-foreground">
                  <span className="mr-1 text-label-sm font-normal text-muted-foreground">
                    {t('step1.fromLabel')}
                  </span>
                  <Price
                    amountKrw={fromPrice}
                    currency={currency}
                    intlLocale={locale}
                    rates={rates}
                  />
                </p>

                <div className="mt-stack-lg flex-1" />
                <Link
                  href={`/booking/schedule?package=${pkg.slug}`}
                  className="mt-stack-md inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  {t('step1.selectCta')}
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
