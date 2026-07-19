import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRedisGet, mockRedisSet, mockGetRedis } = vi.hoisted(() => {
  const mockRedisGet = vi.fn().mockResolvedValue(null); // 캐시 미스 기본값
  const mockRedisSet = vi.fn().mockResolvedValue('OK');
  const mockGetRedis = vi.fn(() => ({ get: mockRedisGet, set: mockRedisSet }));
  return { mockRedisGet, mockRedisSet, mockGetRedis };
});

// Redis mock
vi.mock('@/lib/redis/client', () => ({ getRedis: mockGetRedis }));

// Prisma mock
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    exchangeRate: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

// OXR fetch mock
vi.mock('../client', () => ({
  fetchLatestRates: vi.fn().mockResolvedValue({
    base: 'USD',
    timestamp: 1234567890,
    rates: {
      KRW: 1350.0,
      USD: 1.0,
      JPY: 155.0,
      CNY: 7.2,
      HKD: 7.8,
    },
  }),
}));

import { DisplayCurrency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getExchangeRate, getExchangeRates } from '../cache';

describe('getExchangeRate', () => {
  it('KRW → 1:1', async () => {
    const rate = await getExchangeRate(DisplayCurrency.KRW);
    expect(rate.equals(new Decimal(1))).toBe(true);
  });

  it('USD → 1350 KRW', async () => {
    const rate = await getExchangeRate(DisplayCurrency.USD);
    // 1350 / 1 = 1350
    expect(rate.toNumber()).toBeCloseTo(1350, 0);
  });

  it('JPY → 약 8.7 KRW', async () => {
    const rate = await getExchangeRate(DisplayCurrency.JPY);
    // 1350 / 155 ≈ 8.709
    expect(rate.toNumber()).toBeCloseTo(8.709, 2);
  });

  it('캐시 히트 시 OXR 호출 안 함', async () => {
    const { fetchLatestRates } = await import('../client');
    vi.mocked(fetchLatestRates).mockClear();

    mockGetRedis.mockReturnValueOnce({
      get: vi.fn().mockResolvedValue(
        JSON.stringify({
          KRW: '1',
          USD: '1350',
          JPY: '8.709',
          CNY: '190.5',
          HKD: '173.0',
          fetchedAt: new Date().toISOString(),
        }),
      ),
      set: vi.fn(),
    } as ReturnType<typeof mockGetRedis>);

    await getExchangeRates();
    expect(fetchLatestRates).not.toHaveBeenCalled();
  });
});
