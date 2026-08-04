import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { PackageComparison } from '@/components/catalog/package-comparison';
import { BookingBarSection } from '@/components/home/booking-bar-section';
import { buildComparison } from '@/lib/catalog/comparison';
import { isCategoryVisibleForLocale } from '@/lib/catalog/locale-visibility';
import { computePackageTotal } from '@/lib/catalog/pricing';
import { listPackages } from '@/lib/catalog/queries';
import { LOCALE_DEFAULT_CURRENCY } from '@/lib/currency/config';
import { CURRENCY_COOKIE, parseCurrencyOverride } from '@/lib/currency/cookie';
import { formatApprox, formatKrw } from '@/lib/currency/format';
import { getExchangeRates } from '@/lib/exchange/cache';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

/**
 * PRODUCT 페이지 (시퀀스 5c) — 구 /experience 를 대체한다(결정 ① = A 리네임).
 * 실측 소스 = `design/pages/Product.dc.html`. 스펙 = `docs/specs/Product_Slice_Spec.md`.
 *
 * 재사용이 이 슬라이스의 핵심이다 — 디자인의 자체 데이터가 PRD·가격 모델과 다수 충돌하므로
 * (Gold 카드에 CD·사진 누락, 비교표 CD 행 Gold '—', Making 최소 2인, "MP3 only",
 * Melodyne 미확인 주장 — 스펙 §1 델타표), 검증된 레포 정본을 그대로 쓴다:
 *  - 카드 포함 목록 = `packages.items.{slug}.includes` (PRD §5.6 정합, 보컬 리포트 반영본)
 *  - 비교표 = `PackageComparison` + `buildComparison` (O2 매트릭스 준수)
 *  - 예약바 = `BookingBarSection` (4e 위험 구역 검증본 — 실 슬롯·draft 공유·읽기 전용)
 *  - 가격·시간·인원 = DB(listPackages) — 정액 하드코딩 0 (§6)
 *
 * 가격 표기는 <Price> 대신 formatKrw/formatApprox 직접 호출 — <Price>의 참고 환율 스팬이
 * `text-muted-foreground` 고정이라 다크 서피스(Premium 카드·단체 패널)에서 대비가 깨진다.
 * KRW가 항상 주 표기, 외화는 ≈ 참고(§3.2 — 디자인의 "외화 주 표기 + KRW 참고"는 뒤집어 채택).
 *
 * 환불 스트립·FAQ 취소 답변: 디자인은 "[PROVIDE POLICY]" placeholder — PRD §5.3
 * 3구간(≥3일 100% / 2일 80% / 1일 50% / 당일·노쇼 0%, PG 수수료 공제)이 정본. 전체 정책
 * 페이지는 legal 슬라이스(M5) 소관이라 링크는 만들지 않는다(죽은 링크 0).
 *
 * 결과물 갤러리(디자인 6슬롯)는 **미구현** — 디자인 자체 주석 "leave empty until client
 * provides" + 실사진 pre-flight 미해소. 빈 타일 6개는 정보가치가 없어 섹션째 이연(스펙 §1-D6).
 */
export const dynamic = 'force-dynamic';

const CARD_STYLE = {
  gold: {
    card: 'bg-paper-raise text-foreground',
    rule: 'border-foreground/[0.12]',
    btn: 'bg-foreground text-background',
  },
  diamond: {
    card: 'bg-primary text-foreground',
    rule: 'border-foreground/25',
    btn: 'bg-foreground text-background',
  },
  premium: {
    card: 'bg-foreground text-background',
    rule: 'border-background/[0.18]',
    btn: 'bg-primary text-foreground',
  },
} as const;
type CardSlug = keyof typeof CARD_STYLE;

// 디자인 실측(Diamond popular 배지) — 순수 장식 강조, 데이터 아님.
const POPULAR_SLUG = 'diamond';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'product' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function ProductPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'product' });
  const tp = await getTranslations({ locale, namespace: 'packages' });

  const prismaLocale = toPrismaLocale(locale as Locale);
  const [all, rentalVisible, rates] = await Promise.all([
    listPackages({ locale: prismaLocale }),
    isCategoryVisibleForLocale('rental', locale as Locale),
    getExchangeRates().catch((e) => {
      console.error('[product] exchange rate fetch failed, KRW-only fallback:', e);
      return null;
    }),
  ]);
  const experience = all.filter((p) => p.category === 'experience');
  // CategoryCatalog와 동일한 데이터 주도 게이트 — 체험이 0이면 이 로케일에 팔 것이 없다.
  if (experience.length === 0) notFound();
  const making = all.find((p) => p.slug === 'making-class') ?? null;

  const currency =
    parseCurrencyOverride(cookies().get(CURRENCY_COOKIE)?.value) ??
    LOCALE_DEFAULT_CURRENCY[locale as Locale];
  const approxFor = (amountKrw: number) =>
    rates ? formatApprox(amountKrw, currency, rates[currency], locale) : null;

  type PkgItem = { name: string; tagline: string; includes: string[] };
  const items = tp.raw('items') as Record<string, PkgItem>;
  const maxGuests = Math.max(...experience.map((p) => p.headcountMax));

  return (
    <main>
      {/* Hero — 메타 스트립은 디자인 /40 대신 /70 (§11-W 라이트 서피스 소형 텍스트) */}
      <section className="mx-auto max-w-container-max px-gutter pt-10">
        <div className="flex flex-wrap justify-between gap-1.5 pb-5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/70">
          <span>{t('hero.meta.a')}</span>
          <span>{t('hero.meta.b')}</span>
          <span>{t('hero.meta.c')}</span>
          <span>{t('hero.meta.d')}</span>
        </div>
        <h1 className="ks-display text-[clamp(46px,9vw,110px)] leading-[0.9] tracking-[-0.01em] text-foreground">
          {t('hero.title1')}
          <br />
          {t('hero.title2')}
        </h1>
        <p className="mt-[26px] max-w-[560px] text-[15px] leading-[1.7] text-foreground/70">
          {t('hero.sub', { max: maxGuests })}
        </p>
      </section>

      {/* 패키지 카드 ×3 — 가격·시간은 DB, 포함 목록은 packages.items(PRD §5.6 정합) */}
      <section className="mx-auto max-w-container-max px-gutter pt-11">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[18px]">
          {experience.map((pkg) => {
            const style = CARD_STYLE[pkg.slug as CardSlug] ?? CARD_STYLE.gold;
            const item = items[pkg.slug];
            const baseKrw = computePackageTotal(pkg, pkg.headcountMin).totalKrw;
            const approx = approxFor(baseKrw);
            return (
              <article
                key={pkg.id}
                className={`relative flex flex-col gap-3 rounded-ks-bar p-6 ${style.card}`}
              >
                {pkg.slug === POPULAR_SLUG && (
                  <span className="absolute right-[18px] top-[18px] rounded-full bg-foreground px-2.5 py-[3px] text-[10px] font-extrabold tracking-[0.05em] text-background">
                    {t('cards.popular')}
                  </span>
                )}
                <div>
                  <span className="ks-display text-[26px]">{item?.name ?? pkg.name}</span>
                  {item?.tagline && (
                    <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-[0.06em] opacity-70">
                      {item.tagline}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[27px] font-extrabold leading-tight">
                    {formatKrw(baseKrw)}
                  </span>
                  <span className="text-[12px] font-bold opacity-70">
                    · {tp('catalog.durationLabel', { minutes: pkg.slotMinutes })} ·{' '}
                    {tp('catalog.fromLabel')}
                  </span>
                </div>
                {approx && <span className="-mt-1.5 text-[11.5px] opacity-70">{approx}</span>}
                <ul
                  className={`m-0 flex list-none flex-col gap-2 border-t p-0 pt-2.5 ${style.rule}`}
                >
                  {(item?.includes ?? []).map((inc) => (
                    <li key={inc} className="flex gap-2 text-[13px] leading-[1.5]">
                      <span aria-hidden="true" className="opacity-70">
                        ✓
                      </span>
                      {inc}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/booking/schedule?package=${pkg.slug}`}
                  className={`mt-auto rounded-ks-field p-3 text-center text-[14px] font-extrabold ${style.btn}`}
                >
                  {t('cards.select')} →
                </Link>
              </article>
            );
          })}
        </div>
        <Link
          href="/service"
          className="mt-4 inline-block text-[13px] font-bold text-foreground/70 underline-offset-4 hover:underline"
        >
          {t('cards.serviceLink')} →
        </Link>
      </section>

      {/* 단체 프로그램 — making-class DB 행 기반(인당 정액 × 인원, C11) */}
      {making && (
        <section className="mx-auto max-w-container-max px-gutter pt-[18px]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-7 rounded-ks-bar bg-foreground p-[clamp(24px,4vw,40px)] text-background">
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary px-[11px] py-1 text-[10px] font-extrabold tracking-[0.05em] text-foreground">
                  {t('group.badge')}
                </span>
                <span className="rounded-full border border-background/30 px-[11px] py-1 text-[10px] font-bold text-background/70">
                  {t('group.notSolo')}
                </span>
              </div>
              <span className="ks-display text-[clamp(26px,3.4vw,38px)] leading-[1.02]">
                {items['making-class']?.name ?? making.name}
              </span>
              <p className="m-0 max-w-[44ch] text-[14px] leading-[1.6] text-background/70">
                {t('group.desc')}
              </p>
              <div className="flex flex-wrap gap-[7px]">
                <span className="rounded-full bg-background/[0.08] px-[11px] py-[5px] text-[11.5px] font-semibold">
                  {tp('catalog.headcountLabel', {
                    min: making.headcountMin,
                    max: making.headcountMax,
                  })}
                </span>
                {(items['making-class']?.includes ?? []).map((inc) => (
                  <span
                    key={inc}
                    className="rounded-full bg-background/[0.08] px-[11px] py-[5px] text-[11.5px] font-semibold"
                  >
                    {inc}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-center gap-1.5 sm:border-l sm:border-background/[0.14] sm:pl-7">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-background/65">
                {t('group.perPerson')}
              </span>
              <span className="text-[32px] font-extrabold leading-tight">
                {formatKrw(making.basePriceKrw)}
              </span>
              {approxFor(making.basePriceKrw) && (
                <span className="text-[11.5px] text-background/65">
                  {approxFor(making.basePriceKrw)}
                </span>
              )}
              <span className="mt-0.5 text-[12px] text-background/65">
                {t('group.total', { min: making.headcountMin, max: making.headcountMax })}
              </span>
              <Link
                href="/packages/making-class"
                className="mt-3 self-start rounded-ks-field bg-primary px-5 py-3 text-[14px] font-extrabold text-foreground"
              >
                {t('group.cta')} →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 비교 — 기존 검증 컴포넌트 재사용(자체 제목 포함). 디자인 자체 표(CD 행 Gold '—')는 이식 금지(스펙 §1-D5) */}
      <section className="mx-auto max-w-container-max px-gutter pt-14">
        <PackageComparison locale={locale} columns={buildComparison(experience)} />
        <p className="mt-3 text-[11.5px] text-foreground/70">
          {tp('catalog.krwNotice')} {t('compare.guestNote', { max: maxGuests })}
        </p>
      </section>

      {/* Service 크로스링크 — 5단계 진행 그리드는 Service 전용(디자인 주석 그대로) */}
      <section className="mx-auto max-w-container-max px-gutter pt-8">
        <div className="flex flex-wrap items-center justify-between gap-[18px] border-y border-foreground/[0.14] py-[22px]">
          <span className="text-[14.5px] font-semibold text-foreground/70">
            {t('cross.serviceLine')}
          </span>
          <Link
            href="/service"
            className="whitespace-nowrap rounded-full border border-foreground px-[22px] py-[11px] text-[13px] font-extrabold text-foreground"
          >
            {t('cross.serviceCta')} →
          </Link>
        </div>
      </section>

      {/* Studios 크로스링크 — 대여는 ko 전용이라 비-ko는 비링크 강등(죽은 링크 0, 5a와 동일 패턴) */}
      <section className="mx-auto max-w-container-max px-gutter pt-[22px]">
        <p className="m-0 text-[13px] text-foreground/70">
          {t('cross.rentalLine')}{' '}
          {rentalVisible ? (
            <Link
              href="/rental"
              className="font-extrabold text-foreground underline-offset-4 hover:underline"
            >
              {t('cross.rentalCta')} →
            </Link>
          ) : (
            <span className="cursor-default font-extrabold text-foreground/70">
              {t('cross.rentalCta')}
              <span className="sr-only"> ({t('cross.rentalKoOnly')})</span>
            </span>
          )}
        </p>
      </section>

      {/* FAQ — 답변은 PRD 정본(KRW 단일 청구·인원 +50%·인당×인원·§5.3 환불 3구간·§5.6 SLA) */}
      <section className="mx-auto max-w-[900px] px-gutter pt-14">
        <h2 className="ks-display mb-5 text-[clamp(28px,4vw,44px)] leading-none text-foreground">
          {t('faq.heading')}
        </h2>
        {(['q1', 'q2', 'q3', 'q4', 'q5'] as const).map((k) => (
          <details key={k} className="group border-b border-foreground/[0.12]">
            <summary className="flex cursor-pointer list-none items-center gap-3.5 px-0.5 py-5 text-[17px] font-bold text-foreground [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden="true"
                className="flex-none text-[22px] font-normal text-primary transition-transform group-open:rotate-45"
              >
                +
              </span>
              {t(`faq.${k}.q`)}
            </summary>
            <p className="m-0 px-0.5 pb-[22px] pl-9 text-[14.5px] leading-[1.65] text-foreground/70">
              {t(`faq.${k}.a`, {
                max: maxGuests,
                min: making?.headcountMin ?? 3,
                gmax: making?.headcountMax ?? 15,
              })}
            </p>
          </details>
        ))}
      </section>

      {/* 환불 스트립 — PRD §5.3 3구간 요약. "전체 정책" 링크는 legal 페이지 신설 전까지 미노출 */}
      <section className="mx-auto max-w-container-max px-gutter pt-[26px]">
        <p className="m-0 rounded-ks-card border border-dashed border-foreground/25 bg-paper-raise px-5 py-4 text-[13px] leading-[1.6] text-foreground/70">
          {t('refund.line')}
        </p>
      </section>

      {/* 예약바 — 4e 검증 컴포넌트 재사용(id="bookbar" 앵커 포함) */}
      <div className="pt-11" />
      <BookingBarSection locale={locale} />
    </main>
  );
}
