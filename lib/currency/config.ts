import type { Locale } from '@/lib/i18n/routing';
import type { DisplayCurrency } from '@prisma/client';

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

/**
 * Prisma DisplayCurrency 미러 — 셀렉터 순회용 (④-b).
 * satisfies는 멤버십만 검증(전수 아님). enum 확장 시 누락은 아래
 * CURRENCY_LABEL(Record 전수 강제)이 tsc 에러로 잡는다.
 */
export const DISPLAY_CURRENCIES = [
  'KRW',
  'USD',
  'JPY',
  'TWD',
  'HKD',
] as const satisfies readonly DisplayCurrency[];

/** 통화 셀렉터 라벨: 심볼 + 코드 (④-b 확정 UX). Record 전수 — enum 드리프트를 컴파일에서 차단. */
export const CURRENCY_LABEL: Record<DisplayCurrency, string> = {
  KRW: '₩ KRW',
  USD: '$ USD',
  JPY: '¥ JPY',
  TWD: 'NT$ TWD',
  HKD: 'HK$ HKD',
};

/** 언어 셀렉터 자기표기 라벨 — 번역 키 아님(각 언어 사용자가 자기 언어로 식별, ④-b 확정). */
export const LOCALE_LABEL: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  'zh-TW': '繁體中文（台灣）',
  'zh-HK': '繁體中文（香港）',
};
