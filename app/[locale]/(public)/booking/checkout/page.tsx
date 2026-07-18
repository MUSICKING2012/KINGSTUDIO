import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { BookingProgress } from '@/components/booking/booking-progress';
import { CheckoutForm, type CheckoutLabels } from '@/components/booking/checkout-form';
import { resolveReturningEligibility } from '@/lib/booking/eligibility';
import { isPackageViewable } from '@/lib/catalog/package-visibility';
import { getPackageBySlug } from '@/lib/catalog/queries';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { resolvePackageTier } from '@/lib/slots/publicAvailability';

// Booking Step 4 — checkout (Stage D). Server shell: authoritatively re-loads the package, gates
// visibility/slot-bookability, and resolves returning-member eligibility (auth + DB). The booking
// draft (date/time/options) lives in sessionStorage, so pricing preview + submission run client-side
// in CheckoutForm; the /api/booking/confirm route is the authoritative price/consent boundary. KRW
// single-currency display only (하드제약 #2 / §5.5 결제 직전 화면 KRW 단독).
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'booking.step4' });
  return { title: t('title'), description: t('subtitle') };
}

export default async function BookingStep4Page({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { package?: string };
}) {
  setRequestLocale(locale);
  const prismaLocale = toPrismaLocale(locale as Locale);

  const slug = searchParams.package;
  const pkg = slug ? await getPackageBySlug(slug) : null;
  if (!isPackageViewable(pkg, prismaLocale) || resolvePackageTier(pkg.name) === null) {
    redirect(`/${locale}/booking`);
  }

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const returningEligible = await resolveReturningEligibility(
    userId,
    pkg.returningDiscountEligible,
  );

  const t = await getTranslations({ locale, namespace: 'booking' });
  const tp = await getTranslations({ locale, namespace: 'packages' });
  const pkgItems = tp.raw('items') as Record<string, { name: string }>;

  const progressLabels = {
    aria: t('progress.aria', { current: 4, total: 4 }),
    step1: t('progress.step1'),
    step2: t('progress.step2'),
    step3: t('progress.step3'),
    step4: t('progress.step4'),
  };
  const labels = t.raw('step4') as CheckoutLabels;

  // ko site defaults to KG이니시스, others to PayPal (PRD §5.5). Customer can toggle.
  const defaultPg = locale === 'ko' ? 'inicis' : 'paypal';

  return (
    <main className="mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop">
      <BookingProgress current={4} labels={progressLabels} />

      <div className="mt-section-gap">
        <Link
          href={`/booking/options?package=${pkg.slug}`}
          className="text-label-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← {labels.back}
        </Link>
      </div>

      <header className="mt-stack-md max-w-3xl">
        <p className="text-label-sm uppercase text-muted-foreground">
          {pkgItems[pkg.slug]?.name ?? pkg.name}
        </p>
        <h1 className="mt-stack-sm font-display text-headline-xl font-light text-foreground md:text-display-lg-mobile">
          {labels.title}
        </h1>
        <p className="mt-stack-md text-body-lg text-muted-foreground">{labels.subtitle}</p>
      </header>

      <CheckoutForm
        packageSlug={pkg.slug}
        packageName={pkgItems[pkg.slug]?.name ?? pkg.name}
        pricing={{
          basePriceKrw: pkg.basePriceKrw,
          pricingMode: pkg.pricingMode,
          headcountMin: pkg.headcountMin,
          headcountMax: pkg.headcountMax,
        }}
        cdIncluded={pkg.cdIncluded}
        returningEligible={returningEligible}
        defaultPg={defaultPg}
        locale={locale}
        labels={labels}
      />
    </main>
  );
}
