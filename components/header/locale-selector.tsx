'use client';

import { useLocale, useTranslations } from 'next-intl';

import { LOCALE_LABEL } from '@/lib/currency/config';
import { usePathname, useRouter } from '@/lib/i18n/navigation';
import { locales, type Locale } from '@/lib/i18n/routing';

/** 언어 셀렉터 (④-b 미니멀 바). 라벨은 자기표기 상수 — 번역 키 아님. */
export function LocaleSelector() {
  const locale = useLocale();
  const t = useTranslations('header');
  const pathname = usePathname();
  const router = useRouter();

  return (
    <select
      aria-label={t('localeAria')}
      value={locale}
      onChange={(e) => router.replace(pathname, { locale: e.target.value as Locale })}
      className="rounded-brand-input border border-outline/20 bg-white px-2 py-1 text-label-sm text-on-surface"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABEL[l]}
        </option>
      ))}
    </select>
  );
}
