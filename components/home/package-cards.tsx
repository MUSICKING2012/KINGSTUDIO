import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';

import { Price } from '@/components/price/price';
import { computePackageTotal } from '@/lib/catalog/pricing';
import { listPackages } from '@/lib/catalog/queries';
import { LOCALE_DEFAULT_CURRENCY } from '@/lib/currency/config';
import { CURRENCY_COOKIE, parseCurrencyOverride } from '@/lib/currency/cookie';
import { getExchangeRates } from '@/lib/exchange/cache';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

/**
 * 홈 패키지 카드. 실측 소스 = `design/KING STUDIO Editorial.dc.html` 167–185행.
 * 스펙 = `docs/specs/Home_Slice_Spec.md` §5-B·§5-C (슬라이스 4d).
 *
 * **표시 데이터는 전부 DB.** 디자인 `PKG` 상수(296–299행)의 가격·소요시간·인원과
 * `RATES`(301행) 고정 환율은 전부 이식 금지다(CLAUDE §6 / 토큰 스펙 §8). 카탈로그·예약
 * 화면과 같은 읽기 경로(`listPackages` → `computePackageTotal` → `<Price>`)를 쓴다.
 *
 * 이름·설명은 기존 `packages.items.{slug}.{name,tagline}` 재사용 — 디자인의 descGold/Dia/Pre
 * 를 `home` 으로 복제하지 않는다(카탈로그·예약과 단일 출처 유지, §9-4 주석).
 *
 * 인원 주석은 ICU `{max}` 파라미터다. 디자인의 "Up to 5 guests" 정액 문구는 레포와 불일치한다
 * — `gold.headcountMax = 2`(`seed-packages.ts:21`)이고 Diamond·Premium 만 5 다(§5-C).
 *
 * ⚠ 환율·DB 실패는 전부 우아하게 강등한다. 홈은 최상위 트래픽·SEO 페이지라 이 섹션 때문에
 * 통째로 죽으면 안 된다(4c 에서 확인한 회귀와 동일 사유).
 */

// 카드 스킴 (§5-B). 슬러그 고정 매핑 — displayOrder 가 바뀌어도 색이 흔들리지 않는다.
//
// ⚠ 디자인 기본값은 [light, accent, light] 다(563–569행: bases=[light,dark,light] 에
// accentPackageIndex=1 이 덮음 → dark 미사용). 그대로 두면 Gold·Premium 이 동일한 카드가 되어
// 인접 두 장이 붙어 보인다. 레포에는 같은 3패키지를 이미 light/accent/ink 로 칠하는 선례가
// 있으므로(`components/catalog/package-comparison.tsx:33-47`) 그쪽에 맞춰 dark 를 살린다.
const CARD_STYLE: Record<string, { card: string; rule: string; cta: string }> = {
  gold: {
    card: 'bg-paper-raise text-foreground',
    rule: 'border-foreground/[0.12]',
    cta: 'bg-foreground text-background',
  },
  diamond: {
    // accent 카드 본문은 잉크 고정(ink/#F5461E ≈ 5.1:1). 흰 소형 텍스트 금지(§11-W).
    card: 'bg-primary text-foreground',
    rule: 'border-white/[0.28]',
    cta: 'bg-foreground text-background',
  },
  premium: {
    card: 'bg-foreground text-background',
    rule: 'border-background/[0.18]',
    cta: 'bg-primary text-foreground',
  },
};

const FALLBACK_STYLE = CARD_STYLE.gold;

export async function PackageCards({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'home.packages' });
  const tp = await getTranslations({ locale, namespace: 'packages' });

  const packages = await listPackages({ locale: toPrismaLocale(locale as Locale) }).catch((e) => {
    console.error('[home/packages] listPackages failed, section hidden:', e);
    return [];
  });
  const experience = packages.filter((p) => p.category === 'experience');
  if (experience.length === 0) return null;

  // 표시 전용 환율. 실패 시 null → KRW 단독 표기로 강등(카탈로그와 같은 처리).
  const rates = await getExchangeRates().catch((e) => {
    console.error('[home/packages] exchange rate fetch failed, KRW-only fallback:', e);
    return null;
  });
  const currencyOverride = parseCurrencyOverride(cookies().get(CURRENCY_COOKIE)?.value);
  const currency = currencyOverride ?? LOCALE_DEFAULT_CURRENCY[locale as Locale];

  type PkgItem = { name: string; tagline: string };
  const items = tp.raw('items') as Record<string, PkgItem>;

  // 인원 상한은 노출 중인 패키지의 실제 최대값. 정액 숫자를 카피에 넣지 않는다(§5-C).
  const maxGuests = Math.max(...experience.map((p) => p.headcountMax));

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[18px] pt-[30px]">
        {experience.map((pkg) => {
          const style = CARD_STYLE[pkg.slug] ?? FALLBACK_STYLE;
          const fromPrice = computePackageTotal(pkg, pkg.headcountMin).totalKrw;
          return (
            <article
              key={pkg.id}
              className={`flex min-h-[230px] flex-col gap-[14px] rounded-ks-panel p-6 ${style.card}`}
            >
              <div className="flex items-center justify-between gap-2.5">
                <h3 className="ks-display ks-display-strong text-[24px]">
                  {items[pkg.slug]?.name ?? pkg.name}
                </h3>
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 flex-none place-items-center rounded-full border border-current text-[15px]"
                >
                  ↗
                </span>
              </div>

              <p className="flex-1 text-[13px] leading-[1.6]">{items[pkg.slug]?.tagline}</p>

              <div
                className={`flex flex-wrap items-baseline gap-2 border-t pt-[14px] ${style.rule}`}
              >
                <span className="ks-display ks-display-strong text-[22px]">
                  <Price
                    amountKrw={fromPrice}
                    currency={currency}
                    intlLocale={locale}
                    rates={rates}
                  />
                </span>
                <span className="text-[11.5px] font-semibold">
                  {tp('catalog.durationLabel', { minutes: pkg.slotMinutes })}
                </span>
                <span className="text-[10.5px] font-semibold">{t('vatIncluded')}</span>
              </div>

              <p className="text-[11px]">{t('refOnly')}</p>

              <Link
                href={`/booking/schedule?package=${pkg.slug}`}
                className={`rounded-[10px] p-3 text-center text-[13px] font-bold ${style.cta}`}
              >
                {t('selectCta')}
              </Link>
            </article>
          );
        })}
      </div>

      <p className="pt-[14px] text-[12px] text-foreground/70">
        {t('guestNote', { max: maxGuests })}
      </p>
    </>
  );
}
