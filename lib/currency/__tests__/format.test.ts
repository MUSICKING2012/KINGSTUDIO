import { locales } from '@/lib/i18n/routing';
import { Decimal } from '@prisma/client/runtime/library';
import { describe, expect, it } from 'vitest';
import { LOCALE_DEFAULT_CURRENCY } from '../config';
import { formatApprox, formatKrw } from '../format';

describe('LOCALE_DEFAULT_CURRENCY', () => {
  it('routing.locales 5개 전부에 매핑이 존재한다 (C14)', () => {
    for (const l of locales) expect(LOCALE_DEFAULT_CURRENCY[l]).toBeDefined();
  });
});

describe('formatKrw', () => {
  it('기존 표기 불변: 241840 → "241,840 KRW"', () => {
    expect(formatKrw(241840)).toBe('241,840 KRW');
  });
});

describe('formatApprox', () => {
  it('KRW는 병기 대상이 아니므로 null', () => {
    expect(formatApprox(241840, 'KRW', new Decimal(1), 'ko')).toBeNull();
  });
  it('USD: 1350000 KRW, 1 USD=1350 KRW → ≈ $1,000', () => {
    expect(formatApprox(1350000, 'USD', new Decimal(1350), 'en')).toBe('≈ $1,000');
  });
  it('JPY: 소수점 0자리 고정', () => {
    const out = formatApprox(1350000, 'JPY', new Decimal(9), 'en');
    expect(out).toBe('≈ ¥150,000');
  });
  it('≈ 라벨이 항상 접두된다 (PRD approximate 강제)', () => {
    expect(formatApprox(100000, 'USD', new Decimal(1350), 'en')).toMatch(/^≈ /);
  });
});
