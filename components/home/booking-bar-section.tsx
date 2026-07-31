import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';

import { BookingBar, type BookingBarPackage } from '@/components/home/booking-bar';
import { Price } from '@/components/price/price';
import { isPackageBookableOnline } from '@/lib/catalog/package-visibility';
import { computePackageTotal } from '@/lib/catalog/pricing';
import { listPackages } from '@/lib/catalog/queries';
import { LOCALE_DEFAULT_CURRENCY } from '@/lib/currency/config';
import { CURRENCY_COOKIE, parseCurrencyOverride } from '@/lib/currency/cookie';
import { getExchangeRates } from '@/lib/exchange/cache';
import { toPrismaLocale } from '@/lib/i18n/locale';
import type { Locale } from '@/lib/i18n/routing';
import { resolvePackageTier } from '@/lib/slots/publicAvailability';
import { bookingWindow } from '@/lib/slots/window';

/**
 * ⚠ **위험 구역 인접 — 검증 필요 (CLAUDE.md §4).**
 *
 * 홈 예약바의 **서버 절반**. 상호작용은 `booking-bar.tsx`(클라이언트)가 맡고, 여기서는
 * 클라이언트가 만들면 안 되는 값만 계산해 내려보낸다:
 *
 *  - **예약 가능 패키지 목록** — `booking/page.tsx:46-48` 과 동일 게이트를 그대로 쓴다.
 *    `listPackages`(languagesAvailable, C11) → `isPackageBookableOnline`(bookingFlow =
 *    instant_payment 가 정본 게이트, b2b_quote 는 B2B 견적) → `resolvePackageTier !== null`
 *    (슬롯 그리드 없는 단체 패키지 구조적 배제). 홈이 자체 판정을 만들지 않는다.
 *  - **날짜 범위** — `bookingWindow()`(`lib/slots/window.ts:22`). 디자인의 `kstDate(1)/
 *    kstDate(90)`(520행)은 이식 금지(§6-E). D+1~D+90 은 서버의 KST 기준으로만 계산한다.
 *  - **가격 표기** — `computePackageTotal` + `<Price>`. 통화는 쿠키 ?? 로케일 기본,
 *    환율 실패 시 KRW 단독으로 강등.
 *
 * DB 실패 시 섹션을 통째로 숨긴다(`null`) — 홈이 이 섹션 때문에 죽으면 안 된다(4c·4d 와 동일).
 */
export async function BookingBarSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'home.booking' });
  const tp = await getTranslations({ locale, namespace: 'packages' });

  const all = await listPackages({ locale: toPrismaLocale(locale as Locale) }).catch((e) => {
    console.error('[home/booking-bar] listPackages failed, section hidden:', e);
    return [];
  });
  const bookable = all.filter((p) => isPackageBookableOnline(p) && resolvePackageTier(p.name));
  if (bookable.length === 0) return null;

  const rates = await getExchangeRates().catch((e) => {
    console.error('[home/booking-bar] exchange rate fetch failed, KRW-only fallback:', e);
    return null;
  });
  const currency =
    parseCurrencyOverride(cookies().get(CURRENCY_COOKIE)?.value) ??
    LOCALE_DEFAULT_CURRENCY[locale as Locale];

  const items = tp.raw('items') as Record<string, { name: string }>;
  const { minDate, maxDate } = bookingWindow();

  const packages: BookingBarPackage[] = bookable.map((pkg) => ({
    slug: pkg.slug,
    name: items[pkg.slug]?.name ?? pkg.name,
    priceLabel: (
      <>
        <Price
          amountKrw={computePackageTotal(pkg, pkg.headcountMin).totalKrw}
          currency={currency}
          intlLocale={locale}
          rates={rates}
        />{' '}
        {tp('catalog.fromLabel')}
      </>
    ),
  }));

  // 인원 상한은 노출 중인 패키지의 실제 최대값 — 정액 숫자를 카피에 넣지 않는다(§6-D).
  const maxGuests = Math.max(...bookable.map((p) => p.headcountMax));

  return (
    <BookingBar
      packages={packages}
      minDate={minDate}
      maxDate={maxDate}
      locale={locale}
      labels={{
        title: t('title'),
        kstNote: t('kstNote'),
        fService: t('fService'),
        fDate: t('fDate'),
        fTime: t('fTime'),
        cta: t('cta'),
        full: t('full'),
        pickDate: t('pickDate'),
        loading: t('loading'),
        loadError: t('loadError'),
        retry: t('retry'),
        noSlots: t('noSlots'),
        note: t('note', { max: maxGuests }),
      }}
    />
  );
}
