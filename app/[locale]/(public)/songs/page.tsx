import type { LicenseType } from '@prisma/client';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SongCard } from '@/components/song/song-card';
import { listSongs } from '@/lib/catalog/song-queries';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { songPath } from '@/lib/seo/urls';
import { getLicenseDisplayEnabled } from '@/lib/settings/license-display';
import { cn } from '@/lib/utils';

// Public song catalog. Cards link to /songs/[slug] (2b-2b-5; NULL-slug songs render as non-link
// cards). Search/preview are still out of scope.
// License badges are gated by §5.7 (getLicenseDisplayEnabled, default OFF in MVP).

// DB-backed catalog + a searchParams filter → render per request (live data, working ?beginner),
// never frozen at build time.
export const dynamic = 'force-dynamic';

const LICENSE_ORDER: LicenseType[] = ['recording', 'mr_distribution', 'lyrics'];

export default async function SongsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { beginner?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations('songs');

  const beginnerOnly = searchParams.beginner === '1';
  const [songs, showLicense] = await Promise.all([
    listSongs({
      locale: toPrismaLocale(locale as Locale),
      beginnerCuration: beginnerOnly ? true : undefined,
    }),
    getLicenseDisplayEnabled(),
  ]);

  const licenseLabels: Record<LicenseType, string> = {
    recording: t('license.recording'),
    mr_distribution: t('license.mr_distribution'),
    lyrics: t('license.lyrics'),
  };

  return (
    <main>
      {/* Editorial hero (§7.2): large headline = ink (text-foreground), small eyebrow =
          text-muted-foreground — accent (#F5461E) is a fill/spot color only, never small text. */}
      <section className="px-margin-mobile py-section-gap md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <p className="font-label-sm text-label-sm uppercase tracking-widest text-muted-foreground">
            KING STUDIO
          </p>
          <h1 className="mt-stack-md font-display text-display-lg-mobile uppercase leading-none text-foreground md:text-display-lg">
            {t('catalog.title')}
          </h1>
          <p className="mt-stack-md max-w-2xl font-sans text-body-lg text-muted-foreground">
            {t('catalog.subtitle')}
          </p>
        </div>
      </section>

      {/* Filters + catalog grid. */}
      <section className="px-margin-mobile py-section-gap md:px-margin-desktop">
        <div className="mx-auto flex max-w-container-max flex-col gap-stack-lg">
          <nav aria-label={t('filters.aria')} className="flex flex-wrap gap-stack-sm">
            <FilterPill href="/songs" active={!beginnerOnly}>
              {t('filters.all')}
            </FilterPill>
            <FilterPill
              href={{ pathname: '/songs', query: { beginner: '1' } }}
              active={beginnerOnly}
            >
              {t('filters.beginnerCuration')}
            </FilterPill>
          </nav>

          {songs.length === 0 ? (
            <p className="font-sans text-body-lg text-muted-foreground">{t('catalog.empty')}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
              {songs.map((song) => {
                // §5.7: resolve badge labels only when the gate is ON; when OFF no license data
                // (not even the verified flags) is sent to the client.
                const licenseBadges = showLicense
                  ? LICENSE_ORDER.filter((type) => song.licenseVerified[type]).map(
                      (type) => licenseLabels[type],
                    )
                  : [];
                return (
                  <SongCard
                    key={song.id}
                    title={song.title}
                    artist={song.artist}
                    beginnerCuration={song.beginnerCuration}
                    beginnerLabel={t('filters.beginnerCuration')}
                    licenseBadges={licenseBadges}
                    // Link only when the song has a slug (NULL until Phase 2 → non-link card). Same
                    // songPath helper as route/sitemap; the i18n Link adds the locale (no hardcoding).
                    href={song.slug ? songPath(song.slug) : undefined}
                  />
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

// Filter toggle as real locale-aware links (keyboard-navigable, no client JS). Active = dark fill
// (high contrast, 17.6:1) vs outline — active state is shape + text, not color alone (§3.9).
function FilterPill({
  href,
  active,
  children,
}: {
  href: Parameters<typeof Link>[0]['href'];
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-full px-4 py-2 font-label-sm text-label-sm uppercase tracking-widest transition-colors',
        active
          ? 'bg-foreground text-background'
          : 'border border-border text-foreground hover:border-primary',
      )}
    >
      {children}
    </Link>
  );
}
