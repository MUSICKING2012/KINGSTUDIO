import type { DisplayCurrency } from '@prisma/client';

import type { ExchangeRates } from '@/lib/exchange/cache';
import { formatApprox, formatKrw } from '@/lib/currency/format';

type PriceProps = {
  amountKrw: number;
  /** 표시통화. 오버라이드 체인(쿠키 ?? 로케일 기본)은 호출측 서버 페이지가 해석 — 이 컴포넌트는 결정된 값만 받는다(④-b). */
  currency: DisplayCurrency;
  /** Intl.NumberFormat 로케일 태그 — 라우팅 locale을 그대로 전달. */
  intlLocale: string;
  /** null 허용 — 환율 조회 실패 시 KRW 단독 표기로 우아한 강등. */
  rates: ExchangeRates | null;
  /** 결제화면용 예약 프롭(PRD: 결제 시 KRW 단독). ④-a에서는 호출처 없음. */
  krwOnly?: boolean;
};

/** 서버 컴포넌트 전용(Decimal 포함 rates를 받으므로 'use client' 금지). */
export function Price({ amountKrw, currency, intlLocale, rates, krwOnly = false }: PriceProps) {
  const krw = formatKrw(amountKrw);
  if (krwOnly || !rates) return <>{krw}</>;
  const approx = formatApprox(amountKrw, currency, rates[currency], intlLocale);
  if (!approx) return <>{krw}</>;
  return (
    <>
      {krw} <span className="text-label-sm font-normal text-muted-foreground">({approx})</span>
    </>
  );
}
