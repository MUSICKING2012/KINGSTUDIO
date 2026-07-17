import { prisma } from '@/lib/db/prisma';
import { getRedis } from '@/lib/redis/client';
import type { DisplayCurrency } from '@prisma/client';
// lib/exchange/cache.ts
import { Decimal } from '@prisma/client/runtime/library';
import { fetchLatestRates } from './client';

const CACHE_TTL_SECONDS = 86400; // 24h
const CACHE_KEY = 'exchange_rates:krw';

// DisplayCurrency → OpenExchangeRates currency code 매핑
const CURRENCY_MAP: Record<DisplayCurrency, string> = {
  KRW: 'KRW',
  USD: 'USD',
  JPY: 'JPY',
  TWD: 'TWD',
  HKD: 'HKD',
};

export interface ExchangeRates {
  KRW: Decimal;
  USD: Decimal;
  JPY: Decimal;
  TWD: Decimal;
  HKD: Decimal;
  fetchedAt: string; // ISO string
}

/**
 * OXR는 USD 기준으로 반환. KRW 기준으로 변환:
 * 1 KRW = ? 외화 → rateToKrw = rates[외화] / rates['KRW']
 * 예: 1 USD = 1350 KRW → rateToKrw(USD) = 1 / (rates['KRW'] / rates['USD']) = rates['USD'] / rates['KRW']
 * 즉 1 외화 = ? KRW → krwPerForeign = rates['KRW'] / rates[외화]
 */
function toKrwRates(oxrRates: Record<string, number>): Record<DisplayCurrency, Decimal> {
  const krwPerUsd = oxrRates.KRW;
  if (!krwPerUsd) throw new Error('KRW rate missing from OXR response');

  return Object.fromEntries(
    Object.entries(CURRENCY_MAP).map(([dc, code]) => {
      const ratePerUsd = oxrRates[code];
      if (!ratePerUsd) throw new Error(`${code} rate missing from OXR response`);
      // 1 외화 = ? KRW
      const krwPerForeign = new Decimal(krwPerUsd).div(new Decimal(ratePerUsd));
      return [dc, krwPerForeign];
    }),
  ) as Record<DisplayCurrency, Decimal>;
}

async function refreshRates(): Promise<ExchangeRates> {
  const oxr = await fetchLatestRates();
  const rates = toKrwRates(oxr.rates);
  const fetchedAt = new Date().toISOString();

  // Redis 캐시 저장
  const redis = getRedis();
  await redis.set(
    CACHE_KEY,
    JSON.stringify({
      ...Object.fromEntries(Object.entries(rates).map(([k, v]) => [k, v.toString()])),
      fetchedAt,
    }),
    { ex: CACHE_TTL_SECONDS },
  );

  // DB 백업 upsert (currency + fetchedAt 기준 — 같은 날 중복 방지)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await Promise.all(
    (Object.entries(rates) as [DisplayCurrency, Decimal][]).map(([currency, rateToKrw]) =>
      prisma.exchangeRate.upsert({
        where: { currency_fetchedAt: { currency, fetchedAt: today } },
        update: { rateToKrw },
        create: { currency, rateToKrw, fetchedAt: today, source: 'openexchangerates' },
      }),
    ),
  );

  return {
    KRW: rates.KRW,
    USD: rates.USD,
    JPY: rates.JPY,
    TWD: rates.TWD,
    HKD: rates.HKD,
    fetchedAt,
  };
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  const redis = getRedis();
  const cached = await redis.get<string>(CACHE_KEY);

  if (cached) {
    const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
    return {
      KRW: new Decimal(parsed.KRW),
      USD: new Decimal(parsed.USD),
      JPY: new Decimal(parsed.JPY),
      TWD: new Decimal(parsed.TWD),
      HKD: new Decimal(parsed.HKD),
      fetchedAt: parsed.fetchedAt,
    };
  }

  return refreshRates();
}

/**
 * 단일 통화 환율 조회 헬퍼
 * @returns 1 외화 = ? KRW (Decimal)
 */
export async function getExchangeRate(currency: DisplayCurrency): Promise<Decimal> {
  const rates = await getExchangeRates();
  return rates[currency];
}
