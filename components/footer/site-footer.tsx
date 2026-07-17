import { useTranslations } from 'next-intl';

import { Link } from '@/lib/i18n/navigation';

// Editorial footer (KING_STUDIO_DESIGN.md §Footer: paper/ink, shared, business info). Links the
// public pages so About/FAQ are reachable. Business-registration line is a FILL-IN placeholder
// (전자상거래법 requires 상호·대표자·사업자등록번호·주소·통신판매업신고 — CLAUDE.md §9 pre-flight).

export function SiteFooter() {
  const t = useTranslations('footer');

  return (
    <footer className="mt-section-gap border-t border-border bg-card">
      <div className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <div className="flex flex-col gap-stack-lg md:flex-row md:justify-between">
          <div className="max-w-sm">
            <p className="font-display text-headline-lg text-foreground">KING STUDIO</p>
            <p className="mt-stack-sm text-body-md text-muted-foreground">{t('tagline')}</p>
          </div>

          <div className="grid grid-cols-2 gap-gutter">
            <nav aria-label={t('exploreHeading')} className="flex flex-col gap-stack-sm">
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-muted-foreground">
                {t('exploreHeading')}
              </p>
              <Link href="/packages" className="text-body-md text-foreground hover:text-primary">
                {t('packages')}
              </Link>
              <Link href="/songs" className="text-body-md text-foreground hover:text-primary">
                {t('songs')}
              </Link>
            </nav>
            <nav aria-label={t('companyHeading')} className="flex flex-col gap-stack-sm">
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-muted-foreground">
                {t('companyHeading')}
              </p>
              <Link href="/about" className="text-body-md text-foreground hover:text-primary">
                {t('about')}
              </Link>
              <Link href="/faq" className="text-body-md text-foreground hover:text-primary">
                {t('faq')}
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-section-gap flex flex-col gap-stack-sm border-t border-border pt-stack-lg text-label-sm text-muted-foreground">
          <p>{t('businessInfo')}</p>
          <p>© 2026 KING STUDIO. {t('rights')}</p>
        </div>
      </div>
    </footer>
  );
}
