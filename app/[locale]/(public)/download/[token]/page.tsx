import type { Metadata } from 'next';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';

import { type DownloadLabels, DownloadList } from '@/components/download/download-list';
import { resolveMagicLink } from '@/lib/download/verify';

// Download page (Stage E1, ⚠ §4 위험구역 — magic-link entry, PRD §5.6). Server component: the raw
// token is verified here (hash lookup, lazy expiry) and NEVER echoed back into markup; rejected
// states render a typed guidance view instead of a bare 404 so a customer with a stale email link
// understands what to do (CS reissue). File downloads go through /api/download/file only.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'download' });
  // Private, tokened page — keep it out of indexes regardless of robots defaults.
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function DownloadPage({
  params: { locale, token },
}: {
  params: { locale: string; token: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'download' });
  const format = await getFormatter({ locale });

  const resolved = await resolveMagicLink(token, { touch: true });

  if (!resolved.ok) {
    const variant = resolved.reason === 'not_found' ? 'invalid' : resolved.reason;
    return (
      <main className="mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop">
        <header className="mt-section-gap max-w-3xl">
          <h1 className="font-display text-headline-xl font-light text-foreground">
            {t(`${variant}.title`)}
          </h1>
          <p className="mt-stack-md text-body-lg text-muted-foreground">{t(`${variant}.body`)}</p>
        </header>
      </main>
    );
  }

  const sessionDate = format.dateTime(resolved.booking.date, { dateStyle: 'long' });
  const expiresOn = format.dateTime(resolved.expiresAt, { dateStyle: 'long' });

  // BigInt → display-safe MB string; storage keys never reach this component (하드제약 #5).
  const items = resolved.items.map((d) => ({
    id: d.id,
    type: d.type,
    version: d.version,
    sizeMb: d.fileSizeBytes === null ? null : Number(d.fileSizeBytes / 1024n / 1024n),
  }));

  const labels = t.raw('list') as DownloadLabels;

  return (
    <main className="mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop">
      <header className="mt-section-gap max-w-3xl">
        <p className="text-label-sm uppercase text-muted-foreground">
          {resolved.booking.packageName ?? 'KING STUDIO'}
        </p>
        <h1 className="mt-stack-sm font-display text-headline-xl font-light text-foreground md:text-display-lg-mobile">
          {t('title')}
        </h1>
        <p className="mt-stack-md text-body-lg text-muted-foreground">
          {t('subtitle', { date: sessionDate })}
        </p>
        <p className="mt-stack-sm text-label-sm text-muted-foreground">
          {t('linkExpires', { date: expiresOn })}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="mt-section-gap rounded-brand-card bg-card p-8 shadow-sm">
          <p className="text-body-lg text-muted-foreground">{t('empty')}</p>
        </div>
      ) : (
        <DownloadList token={token} items={items} labels={labels} />
      )}
    </main>
  );
}
