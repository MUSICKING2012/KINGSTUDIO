'use client';

import { useEffect, useState } from 'react';

import type { DisplayCurrency } from '@prisma/client';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { CURRENCY_LABEL, DISPLAY_CURRENCIES, LOCALE_DEFAULT_CURRENCY } from '@/lib/currency/config';
import {
  CURRENCY_COOKIE,
  CURRENCY_COOKIE_ATTRS,
  parseCurrencyOverride,
} from '@/lib/currency/cookie';
import type { Locale } from '@/lib/i18n/routing';

/**
 * 통화 셀렉터 (④-b). 쿠키 기록 → router.refresh()로 force-dynamic 서버 페이지 재렌더.
 * 초기값은 로케일 기본 — 쿠키는 useEffect에서 보정(SSR hydration 불일치 방지).
 * 가격 자체는 서버가 쿠키를 읽어 렌더하므로 첫 페인트부터 정확하다.
 */
export function CurrencySelector() {
  const locale = useLocale() as Locale;
  const t = useTranslations('header');
  const router = useRouter();
  const [currency, setCurrency] = useState<DisplayCurrency>(LOCALE_DEFAULT_CURRENCY[locale]);

  useEffect(() => {
    const raw = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${CURRENCY_COOKIE}=`))
      ?.split('=')[1];
    const parsed = parseCurrencyOverride(raw);
    if (parsed) setCurrency(parsed);
  }, []);

  return (
    <select
      aria-label={t('currencyAria')}
      value={currency}
      onChange={(e) => {
        const next = e.target.value as DisplayCurrency;
        setCurrency(next);
        document.cookie = `${CURRENCY_COOKIE}=${next}; ${CURRENCY_COOKIE_ATTRS}`;
        router.refresh();
      }}
      className="rounded-lg border border-border/20 bg-white px-2 py-1 text-label-sm text-foreground"
    >
      {DISPLAY_CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {CURRENCY_LABEL[c]}
        </option>
      ))}
    </select>
  );
}
