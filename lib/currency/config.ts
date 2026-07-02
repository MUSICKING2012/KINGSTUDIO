import type { DisplayCurrency } from '@prisma/client';
import type { Locale } from '@/lib/i18n/routing';

/**
 * PRD §통화 정책 / C14: 로케일 → 기본 표시통화.
 * 오버라이드 체인(헤더 드롭다운 → 쿠키)은 ④-b 범위 — 여기서는 로케일 기본값만.
 * KRW는 유일 결제통화이며, 외화는 표시 전용 근사치다.
 */
export const LOCALE_DEFAULT_CURRENCY: Record<Locale, DisplayCurrency> = {
  ko: 'KRW',
  en: 'USD',
  ja: 'JPY',
  'zh-TW': 'TWD',
  'zh-HK': 'HKD',
};
