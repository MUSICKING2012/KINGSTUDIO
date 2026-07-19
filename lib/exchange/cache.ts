import { prisma } from '@/lib/db/prisma';
import { getRedis } from '@/lib/redis/client';
import type { DisplayCurrency } from '@prisma/client';
// lib/exchange/cache.ts
import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { fetchLatestRates } from './client';

const CACHE_TTL_SECONDS = 86400; // 24h
const CACHE_KEY = 'exchange_rates:krw:v2';

// DisplayCurrency → OpenExchangeRates currency code 매핑
const CURRENCY_MAP: Record<DisplayCurrency, string> = {
  KRW: 'KRW',
  USD: 'USD',
  JPY: 'JPY',
  HKD: 'HKD',
  CNY: 'CNY',
};

export interface ExchangeRates {
  KRW: Decimal;
  USD: Decimal;
  JPY: Decimal;
  HKD: Decimal;
  CNY: Decimal;
  fetchedAt: string; // ISO string
}

const decimalStr = z.string().refine((s) => {
  try {
    return new Decimal(s).isFinite();
  } catch {
    return false;
  }
}, 'not a decimal string');

const CachedRatesSchema = z.object({
  KRW: decimalStr,
  USD: decimalStr,
  JPY: decimalStr,
  HKD: decimalStr,
  CNY: decimalStr,
  fetchedAt: z.string().min(1),
});

/** 캐시 역직렬화 + 형태 검증. 실패 시 null 반환 — throw 금지(호출부가 refreshRates로 폴스루). */
function parseCachedRates(cached: unknown): ExchangeRates | null {
  let raw: unknown = cached;
  if (typeof cached === 'string') {
    try {
      raw = JSON.parse(cached);
    } catch {
      return null;
    }
  }
  const r = CachedRatesSchema.safeParse(raw);
  if (!r.success) return null;
  return {
    KRW: new Decimal(r.data.KRW),
    USD: new Decimal(r.data.USD),
    JPY: new Decimal(r.data.JPY),
    HKD: new Decimal(r.data.HKD),
    CNY: new Decimal(r.data.CNY),
    fetchedAt: r.data.fetchedAt,
  };
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
    HKD: rates.HKD,
    CNY: rates.CNY,
    fetchedAt,
  };
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  const redis = getRedis();
  const cached = await redis.get<string>(CACHE_KEY);

  if (cached) {
    const validated = parseCachedRates(cached);
    if (validated) return validated;
    // 형태 불일치(통화 집합 변경·수동 조작) → KRW-only 강등 대신 갱신으로 자기치유.
    // 이 폴스루가 CACHE_KEY 수동 버전 bump 관행을 대체한다.
    console.warn('[exchange] cached rates malformed - refreshing');
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
