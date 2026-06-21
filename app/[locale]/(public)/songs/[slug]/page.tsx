import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Surface } from '@/components/ui/surface';
import { getSongBySlug } from '@/lib/catalog/song-queries';
import { isSongPubliclyVisible } from '@/lib/catalog/song-visibility';
import { toPrismaLocale } from '@/lib/i18n/locale';
import type { Locale } from '@/lib/i18n/routing';

// Song-detail route (2b-2b-1) — route + data consumption only. generateMetadata (2b-2b-2), JSON-LD
// (2b-2b-3), sitemap song URLs (2b-2b-4) and catalog card links (2b-2b-5) are separate slices.
// Minimal body: title / artist / per-locale description (all DB-derived; no hardcoded copy, §5).

// DB-backed, per-request (slug lookup + active gate on live data) — never frozen at build time.
export const dynamic = 'force-dynamic';

export default async function SongDetailPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  setRequestLocale(locale);

  const song = await getSongBySlug(slug, toPrismaLocale(locale as Locale));
  // notFound gate (single source: isSongPubliclyVisible): no song, inactive (private even by direct
  // URL — the "(b)" decision), or NULL slug. A slug lookup can't match a NULL-slug row, but the
  // predicate keeps the rule in one place. The type guard narrows `song` to non-null below.
  if (!isSongPubliclyVisible(song)) notFound();

  return (
    <main>
      {/* Cinematic surface (§7.2): artist eyebrow uses the on-dark primary variant (#ffb4a9,
          10.88:1 — #e83528 would fail AA at label size); the display-size title may use
          brand-primary (#e83528 on #181214 = 4.38:1 → passes AA-large ≥3:1). */}
      <Surface tone="cinematic" className="px-margin-mobile py-section-gap md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <p className="font-label-sm text-label-sm uppercase tracking-widest text-brand-primary-on-dark">
            {song.artist}
          </p>
          <h1 className="mt-stack-md font-display text-display-lg-mobile uppercase leading-none text-brand-primary md:text-display-lg">
            {song.title}
          </h1>
          {song.description ? (
            <p className="mt-stack-md max-w-2xl font-sans text-body-lg text-on-surface-variant">
              {song.description}
            </p>
          ) : null}
        </div>
      </Surface>
    </main>
  );
}
