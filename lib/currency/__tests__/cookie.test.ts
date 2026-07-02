import { describe, expect, it } from 'vitest';

import { CURRENCY_COOKIE_ATTRS, parseCurrencyOverride } from '../cookie';

describe('parseCurrencyOverride — 서버·클라 공용 단일 파서 (④-b)', () => {
  it.each(['KRW', 'USD', 'JPY', 'TWD', 'HKD'] as const)('유효 통화 %s 통과', (c) => {
    expect(parseCurrencyOverride(c)).toBe(c);
  });

  it.each([undefined, null, ''])('%s → null (부재/빈값 기각)', (raw) => {
    expect(parseCurrencyOverride(raw as string | undefined | null)).toBeNull();
  });

  it.each(['EUR', 'krw', 'KRW ', 'ko', 'en', '<script>', 'KRW; Path=/'])(
    '비허용 문자열 %j → null (enum 외 전부 기각 — 로케일 문자열 오승인 방지)',
    (raw) => {
      expect(parseCurrencyOverride(raw)).toBeNull();
    },
  );
});

describe('CURRENCY_COOKIE_ATTRS', () => {
  it('Max-Age 30일 + Path=/ + SameSite=Lax + Secure 포함', () => {
    expect(CURRENCY_COOKIE_ATTRS).toContain('Max-Age=2592000');
    expect(CURRENCY_COOKIE_ATTRS).toContain('Path=/');
    expect(CURRENCY_COOKIE_ATTRS).toContain('SameSite=Lax');
    expect(CURRENCY_COOKIE_ATTRS).toContain('Secure');
  });
});
