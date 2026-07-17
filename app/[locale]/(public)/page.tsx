import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';

// Editorial home (KING_STUDIO_DESIGN.md): light paper surface, ink display headline, accent as a
// spot color (section rule, NYT link, tier label). Static — no DB / live prices (prices live in DB
// per CLAUDE.md §6, shown on /packages). CTAs are ink buttons: shadcn's default variant is accent +
// white (fails AA at label size, §3.9), so primary CTAs override to bg-foreground/text-background.
// All copy lives in messages/*.json home.* (5 locales, key-consistent). NYT = real 2024 feature (§1).

// The New York Times feature (PRD §1). External, locale-agnostic — kept out of i18n.
const NYT_URL = 'https://www.nytimes.com/2024/11/29/fashion/k-pop-recording-sessions-seoul.html';

const STEP_KEYS = ['step1', 'step2', 'step3'] as const;
const TIER_KEYS = ['gold', 'diamond', 'premium'] as const;

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'home' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = useTranslations('home');

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-muted-foreground">
          {t('hero.eyebrow')}
        </p>
        <h1 className="mt-stack-md max-w-4xl font-display text-display-lg-mobile font-light leading-tight text-foreground md:text-display-lg">
          {t('hero.title')}
        </h1>
        <p className="mt-stack-lg max-w-2xl text-body-lg text-muted-foreground">
          {t('hero.subtitle')}
        </p>
        <div className="mt-stack-lg flex flex-wrap gap-stack-md">
          <Button
            asChild
            size="lg"
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Link href="/packages">{t('hero.ctaPrimary')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/songs">{t('hero.ctaSecondary')}</Link>
          </Button>
        </div>
      </section>

      {/* NYT trust strip */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto flex max-w-container-max flex-col gap-stack-sm px-margin-mobile py-stack-lg md:flex-row md:items-center md:justify-between md:px-margin-desktop">
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-muted-foreground">
              {t('nyt.label')}
            </p>
            <p className="mt-stack-sm text-body-lg text-foreground">{t('nyt.source')}</p>
          </div>
          <a
            href={NYT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-stack-sm text-body-md font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('nyt.cta')} <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      {/* How a session works */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <h2 className="border-l-4 border-primary pl-4 font-display text-headline-lg text-foreground">
          {t('steps.heading')}
        </h2>
        <ol className="mt-stack-lg grid grid-cols-1 gap-gutter md:grid-cols-3">
          {STEP_KEYS.map((key, i) => (
            <li key={key} className="rounded-brand-card border border-border bg-card p-stack-lg">
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-muted-foreground">
                {`0${i + 1}`}
              </p>
              <h3 className="mt-stack-sm text-body-lg font-semibold text-foreground">
                {t(`steps.${key}.title`)}
              </h3>
              <p className="mt-stack-sm text-body-md text-muted-foreground">
                {t(`steps.${key}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Experience tiers */}
      <section className="bg-card">
        <div className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
          <h2 className="font-display text-headline-lg text-foreground">
            {t('experience.heading')}
          </h2>
          <p className="mt-stack-sm max-w-2xl text-body-md text-muted-foreground">
            {t('experience.sub')}
          </p>
          <div className="mt-stack-lg grid grid-cols-1 gap-gutter md:grid-cols-3">
            {TIER_KEYS.map((tier) => (
              <div
                key={tier}
                className="flex flex-col rounded-brand-card border border-border bg-background p-stack-lg"
              >
                <p className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
                  {t(`experience.tiers.${tier}.name`)}
                </p>
                <p className="mt-stack-sm flex-1 text-body-md text-foreground">
                  {t(`experience.tiers.${tier}.hook`)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-stack-lg">
            <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
              <Link href="/packages">{t('experience.cta')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Songs teaser */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <div className="flex flex-col gap-stack-md md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-headline-lg text-foreground">{t('songs.heading')}</h2>
            <p className="mt-stack-sm max-w-2xl text-body-md text-muted-foreground">
              {t('songs.sub')}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/songs">{t('songs.cta')}</Link>
          </Button>
        </div>
      </section>

      {/* Closing CTA — sparing ink band (DESIGN.md: ink used sparingly) */}
      <section className="border-t border-border bg-foreground text-background">
        <div className="mx-auto max-w-container-max px-margin-mobile py-section-gap text-center md:px-margin-desktop">
          <h2 className="font-display text-headline-xl">{t('finalCta.heading')}</h2>
          <p className="mt-stack-md text-body-lg text-background/80">{t('finalCta.sub')}</p>
          <div className="mt-stack-lg flex justify-center">
            <Button
              asChild
              size="lg"
              className="bg-background text-foreground hover:bg-background/90"
            >
              <Link href="/packages">{t('finalCta.cta')}</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
