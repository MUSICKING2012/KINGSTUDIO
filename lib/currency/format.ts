import { Decimal } from '@prisma/client/runtime/library';
import type { DisplayCurrency } from '@prisma/client';

/** 기존 packages 페이지의 로컬 formatKrw를 승격 — 표기 불변("241,840 KRW"). */
export function formatKrw(amountKrw: number): string {
  return amountKrw.toLocaleString('ko-KR') + ' KRW';
}

/**
 * KRW → 외화 근사 환산 문자열. 표시 전용(PRD: ≈ 라벨 강제, 결제는 항상 KRW).
 * @param rateToKrw 1 외화 = ? KRW (S3.2 getExchangeRate 반환 규약)
 * @returns "≈ $178" 형식. currency가 KRW면 병기 대상 아님 → null.
 * 소수점: 근사치이므로 전 통화 0자리 고정(min/max 동시 0 — 한쪽만 설정 시 RangeError).
 */
export function formatApprox(
  amountKrw: number,
  currency: DisplayCurrency,
  rateToKrw: Decimal,
  locale: string,
): string | null {
  if (currency === 'KRW') return null;
  const foreign = new Decimal(amountKrw).div(rateToKrw).toNumber();
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(foreign);
  return `≈ ${formatted}`;
}
