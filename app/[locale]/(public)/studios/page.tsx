import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { EditorialImage } from '@/components/home/editorial-image';
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
 * STUDIOS 페이지 (시퀀스 5d-2, 결정 ① = C 단계 분할 / ② = 즉시결제 정본).
 * 실측 소스 = `design/pages/Studio.dc.html`. 스펙 = `docs/specs/Studio_Slice_Spec.md`.
 *
 * 지금 얹는 것(데이터 실재분): 히어로 + 룸 A/B 카드 뼈대(이름·용도·이미지 슬롯) +
 * 대여 패키지 카드(DB) + CTA. 이연(스펙 §1 D3~D5 — client fill-in 미도착): 룸 스펙 표·
 * room↔product 매핑·장비 리스트·팀 섹션. fill-in 도착 시 5d-3 에서 확장.
 *
 * 디자인 대비 의도적 델타:
 *  - 대여 패널의 "온라인 예약 없이 문의로 진행 / 요금·시간 문의 시 안내"는 **이식 금지**
 *    (스펙 §1-D2, 결정 ② — PRD §5.2: 1Hour·1Pro = 슬롯 그리드 + instant_payment + DB 가격).
 *    자리에는 DB 기반 패키지 카드(즉시결제 진입)를 놓는다.
 *  - 이미지 7슬롯은 실사진 pre-flight(§9) 미해소 — `EditorialImage` placeholder(4b 패턴).
 *  - 소형 텍스트 알파 상향: 라이트 /70 (§11-W).
 *
 * 로케일 노출은 5d-1 그대로 — rental 패키지가 0 인 로케일(비-ko)은 notFound().
 * 데이터 주도 게이트(하드코딩 allow-list 금지)라 languagesAvailable 변경 시 자동 추종.
 */
export const dynamic = 'force-dynamic';

const ROOMS = [
  { key: 'a', reverse: false },
  { key: 'b', reverse: true },
] as const;

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'studios' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function StudiosPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'studios' });
  const tp = await getTranslations({ locale, namespace: 'packages' });

  const prismaLocale = toPrismaLocale(locale as Locale);
  const [all, rates] = await Promise.all([
    listPackages({ locale: prismaLocale }),
    getExchangeRates().catch((e) => {
      console.error('[studios] exchange rate fetch failed, KRW-only fallback:', e);
      return null;
    }),
  ]);
  const rental = all.filter((p) => p.category === 'rental');
  // 5d-1 과 동일한 데이터 주도 게이트 — 대여가 0 이면 이 로케일에 팔 것이 없다(비-ko 404).
  if (rental.length === 0) notFound();

  const currency =
    parseCurrencyOverride(cookies().get(CURRENCY_COOKIE)?.value) ??
    LOCALE_DEFAULT_CURRENCY[locale as Locale];
  const approxFor = (amountKrw: number) =>
    rates ? formatApprox(amountKrw, currency, rates[currency], locale) : null;

  type PkgItem = { name: string; tagline: string };
  const items = tp.raw('items') as Record<string, PkgItem>;

  return (
    <main>
      {/* Hero — 메타 스트립은 디자인 /40 대신 /70 (§11-W) */}
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
          {t('hero.sub')}
        </p>
        <div className="mt-[30px] aspect-[21/9] overflow-hidden rounded-ks-bar">
          <EditorialImage alt={t('hero.imageAlt')} className="h-full" />
        </div>
      </section>

      {/* Rooms — 이름·용도·이미지 슬롯만(스펙 표·태그는 fill-in 대기, 스펙 §1-D3 이연) */}
      <section className="mx-auto flex max-w-container-max flex-col gap-6 px-gutter pt-14">
        {ROOMS.map(({ key, reverse }) => (
          <div
            key={key}
            className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 rounded-ks-bar bg-paper-raise p-5"
          >
            <div className={`flex flex-col gap-3 ${reverse ? 'md:order-2' : ''}`}>
              <div className="aspect-[4/3] overflow-hidden rounded-ks-img">
                <EditorialImage alt={t(`rooms.${key}.mainAlt`)} className="h-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="aspect-[4/3] overflow-hidden rounded-ks-img">
                  <EditorialImage alt={t(`rooms.${key}.boothAlt`)} className="h-full" />
                </div>
                <div className="aspect-[4/3] overflow-hidden rounded-ks-img">
                  <EditorialImage alt={t(`rooms.${key}.deskAlt`)} className="h-full" />
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3.5 px-1.5 py-2.5">
              <span className="ks-display text-[clamp(30px,4vw,48px)] leading-none">
                {t(`rooms.${key}.name`)}
              </span>
              <p className="m-0 text-[14px] leading-[1.65] text-foreground/70">
                {t(`rooms.${key}.purpose`)}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* 대여 패키지 — DB 정본(가격·시간·인원), 디자인 "문의제" 패널은 이식 금지(결정 ②) */}
      <section className="mx-auto max-w-container-max px-gutter pt-14">
        <h2 className="ks-display mb-1 text-[clamp(28px,4vw,44px)] leading-none text-foreground">
          {tp('catalog.categories.rental.heading')}
        </h2>
        <p className="m-0 mb-5 text-[14px] text-foreground/70">
          {tp('catalog.categories.rental.subtitle')}
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[18px]">
          {rental.map((pkg) => {
            const baseKrw = computePackageTotal(pkg, pkg.headcountMin).totalKrw;
            const approx = approxFor(baseKrw);
            const item = items[pkg.slug];
            return (
              <article
                key={pkg.id}
                className="flex flex-col gap-3 rounded-ks-bar bg-paper-raise p-6"
              >
                <div>
                  <span className="ks-display text-[26px]">{item?.name ?? pkg.name}</span>
                  {item?.tagline && (
                    <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-foreground/70">
                      {item.tagline}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[27px] font-extrabold leading-tight text-foreground">
                    {formatKrw(baseKrw)}
                  </span>
                  <span className="text-[12px] font-bold text-foreground/70">
                    · {tp('catalog.durationLabel', { minutes: pkg.slotMinutes })} ·{' '}
                    {tp('catalog.headcountLabel', { min: pkg.headcountMin, max: pkg.headcountMax })}
                  </span>
                </div>
                {approx && (
                  <span className="-mt-1.5 text-[11.5px] text-foreground/70">{approx}</span>
                )}
                <Link
                  href={`/packages/${pkg.slug}`}
                  className="mt-auto rounded-ks-field bg-foreground p-3 text-center text-[14px] font-extrabold text-background"
                >
                  {tp('catalog.viewDetail')} →
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA — 대형 헤드라인만 흰색(≥34px w800 = AA-large 통과, 5a 패턴 재사용) */}
      <section className="mx-auto max-w-container-max px-gutter pb-16 pt-14">
        <div className="flex flex-wrap items-center justify-between gap-7 rounded-[24px] bg-primary p-[clamp(30px,5vw,60px)]">
          <h2 className="ks-display text-[clamp(34px,6vw,72px)] leading-[0.94] text-white">
            {t('cta.title1')}
            <br />
            {t('cta.title2')}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/product"
              className="rounded-full bg-white px-[26px] py-[15px] text-[15px] font-extrabold text-foreground"
            >
              {t('cta.packages')} →
            </Link>
            <Link
              href="/product#bookbar"
              className="rounded-full bg-foreground px-[26px] py-[15px] text-[15px] font-extrabold text-background"
            >
              {t('cta.book')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
