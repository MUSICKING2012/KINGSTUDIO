import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { getSongBySlug } from '@/lib/catalog/song-queries';
import { isSongPubliclyVisible } from '@/lib/catalog/song-visibility';
import { toPrismaLocale } from '@/lib/i18n/locale';
import type { Locale } from '@/lib/i18n/routing';
import { buildSongJsonLd } from '@/lib/seo/song-jsonld';
import { buildSongMetadata } from '@/lib/seo/song-metadata';

// Song-detail route (2b-2b-1 body + 2b-2b-2 generateMetadata + 2b-2b-3 JSON-LD). Sitemap song URLs
// (2b-2b-4) and catalog card links (2b-2b-5) are separate slices. Minimal body: title / artist /
// per-locale description (all DB-derived; no hardcoded copy, §5).

// DB-backed, per-request (slug lookup + active gate on live data) — never frozen at build time.
export const dynamic = 'force-dynamic';

// Next calls generateMetadata and the page component separately, each of which needs the song.
// React cache() dedupes them to ONE DB read per request (same (slug, locale) args). Both also run
// the SAME visibility predicate downstream, so meta and the page never disagree.
const loadSong = cache((slug: string, locale: Locale) =>
  getSongBySlug(slug, toPrismaLocale(locale)),
);

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const routingLocale = locale as Locale;
  const song = await loadSong(slug, routingLocale);
  // Private / missing / NULL-slug → empty meta; the page component below owns notFound().
  return buildSongMetadata(song, routingLocale);
}

export default async function SongDetailPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  setRequestLocale(locale);

  const song = await loadSong(slug, locale as Locale);
  // notFound gate (single source: isSongPubliclyVisible): no song, inactive (private even by direct
  // URL — the "(b)" decision), or NULL slug. A slug lookup can't match a NULL-slug row, but the
  // predicate keeps the rule in one place. The type guard narrows `song` to non-null below.
  if (!isSongPubliclyVisible(song)) notFound();

  // MusicRecording JSON-LD (2b-2b-3): same isSongPubliclyVisible gate as above, so non-null here
  // (private songs never reach this point — consistent with the notFound() path).
  const jsonLd = buildSongJsonLd(song, locale as Locale);

  return (
    <main>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: code-built object JSON.stringify'd (no user-controlled markup) — the canonical Next.js way to emit JSON-LD
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {/* Editorial hero (§7.2): large headline = ink (text-foreground), small eyebrow =
          text-muted-foreground — accent (#F5461E) is a fill/spot color only, never small text. */}
      <section className="px-margin-mobile py-section-gap md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <p className="font-label-sm text-label-sm uppercase tracking-widest text-muted-foreground">
            {song.artist}
          </p>
          <h1 className="mt-stack-md font-display text-display-lg-mobile uppercase leading-none text-foreground md:text-display-lg">
            {song.title}
          </h1>
          {song.description ? (
            <p className="mt-stack-md max-w-2xl font-sans text-body-lg text-muted-foreground">
              {song.description}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
