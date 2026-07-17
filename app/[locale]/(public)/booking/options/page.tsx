import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { BookingProgress } from '@/components/booking/booking-progress';
import { OptionsForm, type OptionsFormLabels } from '@/components/booking/options-form';
import { isPackageViewable } from '@/lib/catalog/package-visibility';
import { getPackageBySlug } from '@/lib/catalog/queries';
import { listSongs } from '@/lib/catalog/song-queries';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { resolvePackageTier } from '@/lib/slots/publicAvailability';

// Booking Step 3 — options + consent (PRD §5.7). Read-only DB (song catalogue only). No booking /
// consent / participant rows are written here — they are created atomically at confirmBooking
// (Step 4 / Stage D), where the append-only + minor-block enforcement lives. This step collects
// choices into sessionStorage and validates completeness client-side (mirrored server-side at D).
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'booking.step3' });
  return { title: t('title'), description: t('subtitle') };
}

export default async function BookingStep3Page({
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

  const isRental = pkg.category === 'rental';
  // Song picker: experience only. Gold shows the beginner-curated subset (§5.2); Diamond/Premium
  // the full catalogue. Rental (1Hour/1Pro) brings its own MR → no song. (§5.4 display fallback.)
  const songs =
    pkg.category === 'experience'
      ? (
          await listSongs({
            locale: prismaLocale,
            beginnerCuration: pkg.slug === 'gold' ? true : undefined,
          })
        ).map((s) => ({ id: s.id, title: s.title, artist: s.artist }))
      : [];

  const t = await getTranslations({ locale, namespace: 'booking' });
  const tp = await getTranslations({ locale, namespace: 'packages' });
  const pkgItems = tp.raw('items') as Record<string, { name: string }>;

  const progressLabels = {
    aria: t('progress.aria', { current: 3, total: 4 }),
    step1: t('progress.step1'),
    step2: t('progress.step2'),
    step3: t('progress.step3'),
    step4: t('progress.step4'),
  };
  const labels = t.raw('step3') as OptionsFormLabels;

  return (
    <main className="mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop">
      <BookingProgress current={3} labels={progressLabels} />

      <div className="mt-section-gap">
        <Link
          href={`/booking/schedule?package=${pkg.slug}`}
          className="text-label-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← {t('step3.back')}
        </Link>
      </div>

      <header className="mt-stack-md max-w-3xl">
        <p className="text-label-sm uppercase text-muted-foreground">
          {pkgItems[pkg.slug]?.name ?? pkg.name}
        </p>
        <h1 className="mt-stack-sm font-display text-headline-xl font-light text-foreground md:text-display-lg-mobile">
          {t('step3.title')}
        </h1>
        <p className="mt-stack-md text-body-lg text-muted-foreground">{t('step3.subtitle')}</p>
      </header>

      <OptionsForm
        packageSlug={pkg.slug}
        isRental={isRental}
        headcountMin={pkg.headcountMin}
        headcountMax={pkg.headcountMax}
        songs={songs}
        labels={labels}
      />
    </main>
  );
}
