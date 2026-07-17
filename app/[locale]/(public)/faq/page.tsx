import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';

// Editorial FAQ page (KING_STUDIO_DESIGN.md). Static; all answers rendered (SEO/AEO-friendly). Copy in
// messages/*.json faq.* (5 locales, key-consistent). Answers are grounded in the PRD (hours 10–22 KST,
// deliverables, languages, minors consent); the cancellation answer stays general and points to
// checkout — exact refund terms are legal copy (CLAUDE.md §5.2), not stated here.

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'] as const;

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'faq' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default function FaqPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = useTranslations('faq');

  return (
    <main className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
      <header>
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-muted-foreground">
          {t('eyebrow')}
        </p>
        <h1 className="mt-stack-md font-display text-headline-xl font-light text-foreground md:text-display-lg-mobile">
          {t('heading')}
        </h1>
        <p className="mt-stack-md max-w-2xl text-body-lg text-muted-foreground">{t('sub')}</p>
      </header>

      <dl className="mt-section-gap divide-y divide-border border-t border-border">
        {FAQ_KEYS.map((key) => (
          <div key={key} className="py-stack-lg">
            <dt className="text-body-lg font-semibold text-foreground">{t(`items.${key}.q`)}</dt>
            <dd className="mt-stack-sm max-w-3xl text-body-md text-muted-foreground">
              {t(`items.${key}.a`)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-section-gap rounded-brand-card border border-border bg-card p-stack-lg">
        <h2 className="font-display text-headline-lg text-foreground">{t('cta.heading')}</h2>
        <p className="mt-stack-sm max-w-2xl text-body-md text-muted-foreground">{t('cta.sub')}</p>
        <div className="mt-stack-lg flex flex-wrap gap-stack-md">
          <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
            <Link href="/packages">{t('cta.packages')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/songs">{t('cta.songs')}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
