import { useTranslations } from 'next-intl';

import { Link } from '@/lib/i18n/navigation';

// Editorial footer (Nav_Footer_Slice_Spec_v1 §2, ks-footer.js measured). Ink-footer surface,
// paper text at low opacity. Contact line is a KEPT placeholder (real values await Aiden, §6).
// Terms/Privacy/Refund intentionally NOT rendered (pages absent + legal pending, §7-④).

// Footer link config (like NAV_ITEMS). Contacts points to /about temporarily — the design links
// it to Service; the Service slice will repoint it (§2).
const FOOTER_LINKS = [
  { key: 'about', href: '/about' },
  { key: 'contacts', href: '/about' },
] as const;

export function SiteFooter() {
  const t = useTranslations('footer');

  return (
    <footer className="bg-ink-footer text-paper/70">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-6 py-[34px]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[18px] font-black text-paper">KING STUDIO</p>
            {/* Placeholder contact — do not replace with real values before Aiden confirms (§2/§6). */}
            <p className="text-[12px]">hello@kingstudio.co.kr · +82 2 000 0000</p>
          </div>

          <nav className="flex gap-5 text-[12px] font-bold tracking-[.04em] text-paper/80">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.key} href={link.href} className="hover:text-paper">
                {t(link.key)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-[5px] border-t border-paper/[0.12] pt-4 text-[11.5px] leading-[1.7] text-paper/50">
          <p>{t('businessInfo')}</p>
          <p>{t('krwNotice')}</p>
          <p className="text-paper/[0.32]">© 2026 KING STUDIO. {t('rights')}</p>
        </div>
      </div>
    </footer>
  );
}
