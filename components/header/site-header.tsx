import { useTranslations } from 'next-intl';

import { Link } from '@/lib/i18n/navigation';
import { CurrencySelector } from './currency-selector';
import { LocaleSelector } from './locale-selector';
import { MyPageNavItem } from './my-page-nav-item';
import { NAV_ITEMS } from './nav-items';

/**
 * Editorial site header (Nav_Footer_Slice_Spec_v1 §1). Sticky paper bar with logo, centre nav
 * (config-driven, horizontal-scroll on mobile — no hamburger, per design), locale/currency
 * selectors, and the Book now CTA. Server component; client bits (selectors, My Page gate) are
 * child components. accent = `primary` (§1-C, brand red #F5461E = --primary).
 */
export function SiteHeader() {
  const t = useTranslations('nav');

  return (
    <header className="sticky top-0 z-50 border-b border-ink/[0.08] bg-paper/90 backdrop-blur-[8px]">
      <div className="mx-auto flex min-h-[66px] max-w-[1280px] flex-wrap items-center gap-5 px-6">
        <Link href="/" className="flex items-center gap-[9px]">
          <span
            aria-hidden
            className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-ink text-[14px] font-extrabold text-paper"
          >
            K
          </span>
          <span className="text-[16px] font-black tracking-[.02em] text-ink">KING STUDIO</span>
        </Link>

        <nav className="flex min-w-0 flex-1 justify-center gap-6 overflow-x-auto">
          {NAV_ITEMS.filter((item) => item.enabled).map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="whitespace-nowrap text-[16px] font-semibold text-ink"
            >
              {t(item.key)}
            </Link>
          ))}
          <MyPageNavItem />
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSelector />
          <CurrencySelector />
          <Link
            href="/booking"
            className="rounded-full bg-primary px-[18px] py-2.5 text-[13px] font-bold text-primary-foreground hover:brightness-[.92]"
          >
            {t('bookNow')}
          </Link>
        </div>
      </div>
    </header>
  );
}
