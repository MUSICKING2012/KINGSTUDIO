import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BookingProgress } from '@/components/booking/booking-progress';
import { SlotPicker } from '@/components/booking/slot-picker';
import { isPackageViewable } from '@/lib/catalog/package-visibility';
import { getPackageBySlug } from '@/lib/catalog/queries';
import { redirect } from 'next/navigation';

import { toPrismaLocale } from '@/lib/i18n/locale';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { resolvePackageTier } from '@/lib/slots/publicAvailability';
import { bookingWindow } from '@/lib/slots/window';

// Booking Step 2 — date & time (slot picker). Read-only. Validates the package from Step 1
// (locale gate + slot-grid tier); an invalid/hidden/non-slot package bounces back to Step 1.
// The interactive picker lives in a client component; this shell resolves copy + the KST window.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'booking.step2' });
  return { title: t('title'), description: t('subtitle') };
}

export default async function BookingStep2Page({
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

  // Guard: must be a locale-visible, slot-grid package (else send back to Step 1).
  if (!isPackageViewable(pkg, prismaLocale) || resolvePackageTier(pkg.name) === null) {
    redirect(`/${locale}/booking`);
  }

  const t = await getTranslations({ locale, namespace: 'booking' });
  const tp = await getTranslations({ locale, namespace: 'packages' });
  const pkgItems = tp.raw('items') as Record<string, { name: string; tagline: string }>;
  const { minDate, maxDate } = bookingWindow();

  const progressLabels = {
    aria: t('progress.aria', { current: 2, total: 4 }),
    step1: t('progress.step1'),
    step2: t('progress.step2'),
    step3: t('progress.step3'),
    step4: t('progress.step4'),
  };

  const pickerLabels = {
    dateLabel: t('step2.dateLabel'),
    windowHint: t('step2.windowHint'),
    pickDatePrompt: t('step2.pickDatePrompt'),
    loading: t('step2.loading'),
    loadError: t('step2.loadError'),
    retry: t('step2.retry'),
    noSlots: t('step2.noSlots'),
    available: t('step2.available'),
    soldOut: t('step2.soldOut'),
    timezoneNote: t('step2.timezoneNote'),
    selectedLabel: t('step2.selectedLabel'),
    continueCta: t('step2.continueCta'),
  };

  return (
    <main className="mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop">
      <BookingProgress current={2} labels={progressLabels} />

      <div className="mt-section-gap">
        <Link
          href="/booking"
          className="text-label-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← {t('step2.backToPackages')}
        </Link>
      </div>

      <header className="mt-stack-md max-w-3xl">
        <p className="text-label-sm uppercase text-muted-foreground">
          {pkgItems[pkg.slug]?.name ?? pkg.name}
        </p>
        <h1 className="mt-stack-sm font-display text-headline-xl font-light text-foreground md:text-display-lg-mobile">
          {t('step2.title')}
        </h1>
        <p className="mt-stack-md text-body-lg text-muted-foreground">{t('step2.subtitle')}</p>
      </header>

      <SlotPicker
        packageSlug={pkg.slug}
        locale={locale}
        minDate={minDate}
        maxDate={maxDate}
        labels={pickerLabels}
      />
    </main>
  );
}
