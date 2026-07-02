import type { DisplayCurrency } from '@prisma/client';

import { DISPLAY_CURRENCIES } from './config';

/**
 * 표시통화 오버라이드 쿠키 (④-b).
 * HttpOnly 불가 — 클라 셀렉터가 document.cookie로 읽고 쓴다.
 * Prisma "런타임" import 금지(클라 번들 오염) — type-only만 허용.
 */
export const CURRENCY_COOKIE = 'currency_override';
export const CURRENCY_COOKIE_MAX_AGE = 2592000; // 30일
export const CURRENCY_COOKIE_ATTRS = `Path=/; Max-Age=${CURRENCY_COOKIE_MAX_AGE}; SameSite=Lax; Secure`;

/**
 * 쿠키 원시값 → DisplayCurrency | null.
 * 서버(cookies().get(...)?.value)·클라(document.cookie 파싱) 공용 단일 파서 —
 * 검증 로직 이원화 금지(④-b 확정).
 */
export function parseCurrencyOverride(raw: string | undefined | null): DisplayCurrency | null {
  if (!raw) return null;
  return (DISPLAY_CURRENCIES as readonly string[]).includes(raw) ? (raw as DisplayCurrency) : null;
}
