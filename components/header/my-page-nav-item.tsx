'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '@/lib/i18n/navigation';

/**
 * My Page nav entry, gated on the `ks_returning=1` cookie (Nav_Footer_Slice_Spec_v1 §1-D).
 * Client-side cookie read (not server `cookies()`) so the layout stays statically renderable
 * for generateStaticParams — new visitors never see it; a post-hydration reveal is acceptable.
 * The cookie is *set* by the My Page / magic-link slice, out of scope here.
 */
export function MyPageNavItem() {
  const t = useTranslations('nav');
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    const isReturning = document.cookie
      .split('; ')
      .map((c) => c.split('='))
      .some(([name, value]) => name === 'ks_returning' && value === '1');
    setReturning(isReturning);
  }, []);

  if (!returning) return null;

  return (
    <Link href="/my" className="whitespace-nowrap text-[16px] font-semibold text-ink">
      {t('myPage')}
    </Link>
  );
}
