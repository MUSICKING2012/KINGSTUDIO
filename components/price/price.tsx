import type { ExchangeRates } from '@/lib/exchange/cache';
import { LOCALE_DEFAULT_CURRENCY } from '@/lib/currency/config';
import { formatApprox, formatKrw } from '@/lib/currency/format';
import type { Locale } from '@/lib/i18n/routing';

type PriceProps = {
  amountKrw: number;
  locale: Locale;
  /** null 허용 — 환율 조회 실패 시 KRW 단독 표기로 우아한 강등. */
  rates: ExchangeRates | null;
  /** 결제화면용 예약 프롭(PRD: 결제 시 KRW 단독). ④-a에서는 호출처 없음. */
  krwOnly?: boolean;
};

/** 서버 컴포넌트 전용(Decimal 포함 rates를 받으므로 'use client' 금지). */
export function Price({ amountKrw, locale, rates, krwOnly = false }: PriceProps) {
  const krw = formatKrw(amountKrw);
  if (krwOnly || !rates) return <>{krw}</>;
  const currency = LOCALE_DEFAULT_CURRENCY[locale];
  const approx = formatApprox(amountKrw, currency, rates[currency], locale);
  if (!approx) return <>{krw}</>;
  return (
    <>
      {krw} <span className="text-label-sm font-normal text-muted-text">({approx})</span>
    </>
  );
}
