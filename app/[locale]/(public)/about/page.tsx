import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';

// Editorial About / NYT page (KING_STUDIO_DESIGN.md). Static — story facts from PRD §1 (D2C since
// 2017, NYT 2024 feature, "record in a real studio and take home your own audio & photos"). Copy in
// messages/*.json about.* (5 locales, key-consistent). NYT = real 2024-11-29 feature.

const NYT_URL = 'https://www.nytimes.com/2024/11/29/fashion/k-pop-recording-sessions-seoul.html';

const POINT_KEYS = ['studio', 'takeaway', 'direct'] as const;

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'about' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default function AboutPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = useTranslations('about');

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-muted-foreground">
          {t('hero.eyebrow')}
        </p>
        <h1 className="mt-stack-md max-w-3xl font-display text-headline-xl font-light leading-tight text-foreground md:text-display-lg-mobile">
          {t('hero.title')}
        </h1>
        <p className="mt-stack-lg max-w-2xl text-body-lg text-muted-foreground">
          {t('hero.subtitle')}
        </p>
      </section>

      {/* Story */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-container-max grid-cols-1 gap-gutter px-margin-mobile py-section-gap md:grid-cols-3 md:px-margin-desktop">
          <h2 className="font-display text-headline-lg text-foreground">{t('story.heading')}</h2>
          <div className="flex flex-col gap-stack-md md:col-span-2">
            <p className="text-body-lg text-foreground">{t('story.body1')}</p>
            <p className="text-body-md text-muted-foreground">{t('story.body2')}</p>
          </div>
        </div>
      </section>

      {/* What makes it different */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <h2 className="border-l-4 border-primary pl-4 font-display text-headline-lg text-foreground">
          {t('points.heading')}
        </h2>
        <div className="mt-stack-lg grid grid-cols-1 gap-gutter md:grid-cols-3">
          {POINT_KEYS.map((key) => (
            <div key={key} className="rounded-brand-card border border-border bg-card p-stack-lg">
              <h3 className="text-body-lg font-semibold text-foreground">
                {t(`points.${key}.title`)}
              </h3>
              <p className="mt-stack-sm text-body-md text-muted-foreground">
                {t(`points.${key}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* NYT feature */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
          <p className="font-label-sm text-label-sm uppercase tracking-widest text-muted-foreground">
            {t('nyt.label')}
          </p>
          <h2 className="mt-stack-md max-w-3xl font-display text-headline-lg font-light text-foreground">
            {t('nyt.title')}
          </h2>
          <p className="mt-stack-md max-w-2xl text-body-md text-muted-foreground">
            {t('nyt.body')}
          </p>
          <a
            href={NYT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-stack-md inline-flex items-center gap-stack-sm text-body-md font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('nyt.cta')} <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <h2 className="font-display text-headline-lg text-foreground">{t('cta.heading')}</h2>
        <p className="mt-stack-sm max-w-2xl text-body-md text-muted-foreground">{t('cta.sub')}</p>
        <div className="mt-stack-lg">
          <Button
            asChild
            size="lg"
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Link href="/packages">{t('cta.button')}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
