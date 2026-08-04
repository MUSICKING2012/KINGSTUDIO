import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { listPackages } from '@/lib/catalog/queries';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { getReviewStats, listPublishedReviews } from '@/lib/review/list';

/**
 * REVIEWS 페이지 (시퀀스 5b). 실측 소스 = `design/pages/Review.dc.html`
 * (sha256 ba82f15c…58ee07). 스펙 = `docs/specs/Reviews_Slice_Spec.md`.
 * 결정 ④(2026-08-04): published 만 · 마스킹 표시명 · 최신순 커서 · 평균 노출 · 전체 언어.
 *
 * 디자인 대비 델타(스펙 §1 — 전부 데이터 정합 사유):
 *  - 히어로 통계·리뷰 8건·"40+ COUNTRIES" = 디자인 자체 표기 샘플("no fabricated
 *    ratings") → 이식 0. 통계는 DB 집계, 0건이면 통계 카드·필터 바 미렌더.
 *  - 국가/국기·영상 카드 = 스키마 부재(영상은 M8 어드민 소관) → 미구현. 서브라인은 날짜.
 *  - 필터 칩 라벨 = listPackages(DB) — 하드코딩 0. 서버사이드 ?package= 링크(JS 0).
 *  - 별점은 ★ + sr-only "{rating}/5" 텍스트 병기(§3.9). 아바타 원은 장식(aria-hidden).
 *  - PII(authorNameSnapshot·ip)는 select 자체에서 제외(lib/review/list.ts).
 *
 * force-dynamic: 리뷰는 제출 즉시 노출(status=published 기본)이라 요청 시 조회.
 */
export const dynamic = 'force-dynamic';

const STAR_FULL = '★';
const STAR_EMPTY = '☆';

// 아바타 배경(장식) — authorDisplay 해시로 고정 팔레트에서 결정적 선택. 정보 전달 없음.
const AVATAR_PALETTE = [
  '#C2410C',
  '#7C3AED',
  '#0369A1',
  '#15803D',
  '#BE185D',
  '#0F766E',
  '#B45309',
  '#4338CA',
];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
function initials(display: string): string {
  const parts = display.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·';
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'reviews' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function ReviewsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { package?: string; cursor?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'reviews' });

  const activePackage = searchParams.package ?? null;
  const [stats, { reviews, nextCursor }, packages] = await Promise.all([
    getReviewStats(),
    listPublishedReviews({ cursor: searchParams.cursor ?? null, packageName: activePackage }),
    // 필터 칩 라벨 — 슬롯 예약 가능한 체험 + 단체(리뷰가 달릴 수 있는 카테고리). DB 가 정본.
    listPackages({ locale: toPrismaLocale(locale as Locale) }).catch(() => []),
  ]);
  const filterNames = packages
    .filter((p) => p.category === 'experience' || p.category === 'group')
    .map((p) => p.name);

  const dateFmt = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const filterHref = (name: string | null) =>
    name ? `/reviews?package=${encodeURIComponent(name)}` : '/reviews';

  return (
    <main>
      {/* Hero + 집계 (디자인 51–72행). 통계는 DB — 0건이면 카드 미렌더(허위 표시 금지) */}
      <section className="mx-auto max-w-container-max px-gutter pt-10">
        <div className="flex flex-wrap justify-between gap-1.5 pb-5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/70">
          <span>{t('metaLabel')}</span>
          <a
            href="https://www.nytimes.com/2024/11/29/fashion/k-pop-recording-sessions-seoul.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:underline"
          >
            NYT 2024 ↗
          </a>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-7">
          <h1 className="ks-display text-[clamp(46px,9vw,110px)] leading-[0.9] tracking-[-0.01em] text-foreground">
            {t('hero.title1')}
            <br />
            {t('hero.title2')}
          </h1>
          {stats.count > 0 && stats.average != null && (
            <div className="flex flex-wrap gap-3.5">
              <div className="min-w-[130px] rounded-ks-panel bg-card p-5 px-6 shadow-edi-caption">
                <div className="text-[40px] font-extrabold leading-none text-primary">
                  {stats.average.toFixed(1)}
                </div>
                <div className="mt-1.5 text-[12px] text-foreground/70">{t('stats.avgLabel')}</div>
              </div>
              <div className="min-w-[130px] rounded-ks-panel bg-card p-5 px-6 shadow-edi-caption">
                <div className="text-[40px] font-extrabold leading-none text-foreground">
                  {stats.count}
                </div>
                <div className="mt-1.5 text-[12px] text-foreground/70">{t('stats.countLabel')}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 필터 바 (디자인 76–85행) — 서버사이드 링크 필터. 리뷰 0건이면 미렌더 */}
      {stats.count > 0 && (
        <section className="mx-auto max-w-container-max px-gutter pt-8">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={filterHref(null)}
              aria-current={activePackage == null ? 'true' : undefined}
              className={
                activePackage == null
                  ? 'rounded-full border border-foreground bg-foreground px-4 py-[9px] text-[13px] font-bold text-background'
                  : 'rounded-full border border-foreground/20 px-4 py-[9px] text-[13px] font-bold text-foreground'
              }
            >
              {t('filters.all')}
            </Link>
            {filterNames.map((name) => (
              <Link
                key={name}
                href={filterHref(name)}
                aria-current={activePackage === name ? 'true' : undefined}
                className={
                  activePackage === name
                    ? 'rounded-full border border-foreground bg-foreground px-4 py-[9px] text-[13px] font-bold text-background'
                    : 'rounded-full border border-foreground/20 px-4 py-[9px] text-[13px] font-bold text-foreground'
                }
              >
                {name}
              </Link>
            ))}
            <Link
              href="/my"
              className="ml-auto whitespace-nowrap text-[12.5px] font-bold text-foreground/70 underline-offset-4 hover:underline"
            >
              {t('filters.writeCta')}
            </Link>
          </div>
        </section>
      )}

      {/* 리뷰 그리드 (디자인 88–133행) — 텍스트 카드만(영상 = M8) */}
      <section className="mx-auto max-w-container-max px-gutter pt-[22px]">
        {reviews.length === 0 ? (
          <div className="py-16 text-center text-[14px] text-foreground/70">
            {stats.count === 0 ? t('empty.noneYet') : t('empty.filterNone')}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]">
            {reviews.map((r) => (
              <article
                key={r.id}
                className="flex flex-col rounded-ks-panel bg-card p-6 pb-[18px] shadow-edi-caption"
              >
                <span
                  aria-hidden="true"
                  className="text-[44px] font-extrabold leading-[0.5] text-primary/50"
                >
                  &ldquo;
                </span>
                {r.body && (
                  <p className="mt-3.5 flex-1 text-[16px] font-semibold leading-[1.55] text-foreground">
                    {r.body}
                  </p>
                )}
                <div className="mt-3.5 flex items-center gap-2.5 border-t border-foreground/[0.08] pt-3.5">
                  <span
                    aria-hidden="true"
                    className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full text-[12px] font-extrabold text-white"
                    style={{ backgroundColor: avatarColor(r.authorDisplay) }}
                  >
                    {initials(r.authorDisplay)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-foreground">{r.authorDisplay}</div>
                    <div className="text-[11px] text-foreground/70">
                      {dateFmt.format(r.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    {r.packageName && (
                      <span className="inline-block rounded-[6px] bg-paper-raise px-2 py-0.5 text-[9.5px] font-extrabold text-foreground">
                        {r.packageName}
                      </span>
                    )}
                    <div
                      aria-hidden="true"
                      className="mt-[3px] text-[11px] tracking-[1px] text-[#E8A94B]"
                    >
                      {STAR_FULL.repeat(r.rating)}
                      {STAR_EMPTY.repeat(5 - r.rating)}
                    </div>
                    <span className="sr-only">{t('card.ratingAria', { rating: r.rating })}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {nextCursor && (
          <div className="pt-7 text-center">
            <Link
              href={`/reviews?${new URLSearchParams({
                ...(activePackage ? { package: activePackage } : {}),
                cursor: nextCursor,
              }).toString()}`}
              className="inline-block rounded-full border border-foreground/25 px-6 py-3 text-[13px] font-bold text-foreground hover:border-foreground"
            >
              {t('loadMore')}
            </Link>
          </div>
        )}
      </section>

      {/* CTA (디자인 137–147행) — 다크 패널. accent 채움 위 라벨은 잉크(§11-W) */}
      <section className="mx-auto max-w-container-max px-gutter pb-16 pt-14">
        <div className="flex flex-wrap items-center justify-between gap-7 rounded-[24px] bg-ink-deep p-[clamp(30px,5vw,60px)] text-paper">
          <h2 className="ks-display text-[clamp(30px,5vw,60px)] leading-[0.94]">
            {t('cta.title1')}
            <br />
            {t('cta.title2')}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/booking"
              className="rounded-full bg-primary px-[26px] py-[15px] text-[15px] font-extrabold text-foreground"
            >
              {t('cta.book')}
            </Link>
            <Link
              href="/my"
              className="rounded-full border border-paper/35 px-[26px] py-[15px] text-[15px] font-extrabold text-paper"
            >
              {t('cta.write')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
