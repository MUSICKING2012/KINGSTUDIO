import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { isCategoryVisibleForLocale } from '@/lib/catalog/locale-visibility';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

/**
 * SERVICE 페이지 (시퀀스 5a). 실측 소스 = `design/pages/Service.dc.html`
 * (sha256 a9405ef0…084e19). 스펙 = `docs/specs/Service_Slice_Spec.md`.
 *
 * 정적 프리렌더(28→33). DB 직접 조회 없음 — 렌탈 크로스링크 게이트만
 * `isCategoryVisibleForLocale`(unstable_cache) 경유라 정적 생성과 공존한다(헤더와 동일 경로).
 *
 * 카피 정정(Pages_Sequence_Spec §3 판정 이행):
 *  - F1·F2: 인원 정액 숫자(from 2 / up to 5)를 카피에 두지 않는다 — 상세는 카탈로그 위임.
 *  - F3: mp3-only -> "WAV & MP3"(PRD §5.6 raw 2종 ●).
 *  - F4: 퍼스널 보컬 리포트 = Gold 전용 실재(2026-08-03 확정) — 조건을 텍스트로 병기.
 *  - F5: 세션 진행 언어 = EN·KO·JA·ZH 4개(2026-08-03 확정).
 *  - F8: NYT 인용문 원문 일치 확정 — 인용 사용.
 *
 * WCAG 델타(§11-W 기확립): 라이트 소형 텍스트 /70 하한(디자인 .4/.55/.65 미채택),
 * 다크 위 /65 하한, accent 는 대형(≥24px w800 = AA-large 3.4:1 통과) 숫자·헤드라인 스팟과
 * 채움에만. FAQ `+` 아이콘은 aria-hidden 장식.
 */

const NYT_URL = 'https://www.nytimes.com/2024/11/29/fashion/k-pop-recording-sessions-seoul.html';

const PILLAR_KEYS = ['p1', 'p2', 'p3'] as const;
const STEP_KEYS = ['s1', 's2', 's3', 's4', 's5'] as const;
const DELIVERABLE_KEYS = ['d1', 'd2', 'd3', 'd4', 'd5'] as const;
const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
const META_KEYS = ['a', 'b', 'c', 'd', 'e'] as const;

// 디자인 pillar 카드 3스킴(홈 §5-B 와 동일 계열): light / accent / dark.
// accent 카드 본문은 잉크(§11-W — 흰 소형 텍스트 3.4:1 미달), 번호는 카드별 스팟 색.
const PILLAR_STYLE = {
  p1: { card: 'bg-paper-raise text-foreground', num: 'text-primary' },
  p2: { card: 'bg-primary text-foreground', num: 'text-foreground' },
  p3: { card: 'bg-foreground text-background', num: 'text-primary' },
} as const;

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'service' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function ServicePage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'service' });

  // 렌탈 크로스링크: 비-ko 에서 /rental 은 404(1Hour·1Pro ko 전용) — 링크를 만들지 않는다.
  const rentalVisible = await isCategoryVisibleForLocale('rental', locale as Locale);

  return (
    <main>
      {/* Hero (디자인 55–62행) */}
      <section className="mx-auto max-w-container-max px-gutter pt-10">
        <div className="flex flex-wrap justify-between gap-1.5 pb-5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/70">
          {META_KEYS.map((k) => (
            <span key={k}>{t(`hero.meta.${k}`)}</span>
          ))}
        </div>
        <h1 className="ks-display text-[clamp(46px,9vw,110px)] leading-[0.9] tracking-[-0.01em] text-foreground">
          {t('hero.title1')}
          <br />
          {t('hero.title2')}
        </h1>
        <p className="mt-[26px] max-w-[560px] text-[15px] leading-[1.7] text-foreground/70">
          {t('hero.sub')}
        </p>
      </section>

      {/* Trust strip (디자인 65–75행) — 홈 스트립과 별개 변형(인용문 포함, F8 확정 원문) */}
      <section className="mx-auto mt-11 max-w-container-max px-gutter">
        <div className="flex flex-wrap items-center justify-between gap-6 border-y border-foreground/[0.14] py-[22px]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="rounded-full border border-foreground/25 px-3 py-[5px] text-[10.5px] font-extrabold tracking-[0.08em]">
              {t('trust.badge')}
            </span>
            <span className="text-[19px] font-extrabold text-foreground">{t('trust.source')}</span>
          </div>
          <a
            href={NYT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-[520px] text-[13.5px] leading-[1.55] text-foreground/70 underline-offset-4 hover:underline"
          >
            {t('trust.quote')} <span aria-hidden="true">↗</span>
          </a>
          <div className="text-[12px] leading-[1.6] text-foreground/70">
            {t('trust.languages')}
            <br />
            <Link
              href="/reviews"
              className="font-bold text-foreground underline-offset-4 hover:underline"
            >
              {t('trust.reviewsCta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Three pillars (디자인 78–92행) */}
      <section className="mx-auto max-w-container-max px-gutter pt-[52px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[18px]">
          {PILLAR_KEYS.map((k, i) => (
            <div
              key={k}
              className={`flex min-h-[280px] flex-col gap-3 rounded-ks-bar p-7 ${PILLAR_STYLE[k].card}`}
            >
              <span
                aria-hidden="true"
                className={`text-[52px] font-extrabold leading-none ${PILLAR_STYLE[k].num}`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[10.5px] font-extrabold uppercase tracking-[0.09em] opacity-75">
                {t(`pillars.${k}.tier`)} · {t(`pillars.${k}.dur`)}
              </span>
              <span className="ks-display text-[24px] leading-[1.05]">
                {t(`pillars.${k}.title`)}
              </span>
              <p className="m-0 text-[13.5px] leading-[1.6] opacity-80">{t(`pillars.${k}.desc`)}</p>
            </div>
          ))}
        </div>
        <Link
          href="/experience"
          className="mt-[18px] inline-block text-[13px] font-bold text-foreground/70 underline-offset-4 hover:underline"
        >
          {t('pillars.more')}
        </Link>
      </section>

      {/* How a session works (디자인 95–108행) */}
      <section className="mx-auto max-w-container-max px-gutter pt-14">
        <h2 className="ks-display mb-[26px] text-[clamp(28px,4vw,44px)] leading-none text-foreground">
          {t('steps.heading')}
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[18px]">
          {STEP_KEYS.map((k, i) => (
            <div key={k} className="flex flex-col gap-2 border-t-2 border-foreground pt-3.5">
              <span aria-hidden="true" className="text-[24px] font-extrabold text-primary">
                {i + 1}
              </span>
              <span className="text-[16px] font-extrabold text-foreground">
                {t(`steps.${k}.title`)}
              </span>
              <p className="m-0 text-[13px] leading-[1.6] text-foreground/70">
                {t(`steps.${k}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What you take home (디자인 111–131행) — 다크 카드 패널 */}
      <section className="mx-auto max-w-container-max px-gutter pt-14">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8 rounded-ks-bar bg-foreground p-[clamp(28px,4vw,48px)] text-background">
          <div>
            <h2 className="ks-display text-[clamp(28px,3.6vw,42px)] leading-[1.02]">
              {t('takeHome.title1')}
              <br />
              {t('takeHome.title2')}
            </h2>
            <p className="mt-[18px] max-w-[360px] text-[14px] leading-[1.65] text-background/65">
              {t('takeHome.sub')}
            </p>
          </div>
          <div className="flex flex-col">
            {DELIVERABLE_KEYS.map((k) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-4 border-t border-background/[0.14] py-[15px]"
              >
                <span className="text-[15.5px] font-bold">{t(`takeHome.${k}.label`)}</span>
                <span className="whitespace-nowrap text-right text-[12px] text-background/65">
                  {t(`takeHome.${k}.note`)}
                </span>
              </div>
            ))}
            <Link
              href="/experience"
              className="pt-3.5 text-[12.5px] font-semibold text-background/65 underline underline-offset-4"
            >
              {t('takeHome.compare')}
            </Link>
          </div>
        </div>
      </section>

      {/* Cross-links (디자인 134–147행) */}
      <section className="mx-auto max-w-container-max px-gutter pt-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] border-y border-foreground/[0.14]">
          <div className="flex flex-col gap-1.5 py-[22px] pr-6">
            <span className="text-[15px] font-extrabold text-foreground">
              {t('cross.groupTitle')}
            </span>
            <span className="text-[13px] text-foreground/70">{t('cross.groupDesc')}</span>
            <Link
              href="/group"
              className="mt-1 text-[13px] font-extrabold text-foreground underline-offset-4 hover:underline"
            >
              {t('cross.groupCta')}
            </Link>
          </div>
          <div className="flex flex-col gap-1.5 py-[22px] sm:border-l sm:border-foreground/[0.12] sm:pl-6">
            <span className="text-[15px] font-extrabold text-foreground">
              {t('cross.rentalTitle')}
            </span>
            <span className="text-[13px] text-foreground/70">{t('cross.rentalDesc')}</span>
            {rentalVisible ? (
              <Link
                href="/rental"
                className="mt-1 text-[13px] font-extrabold text-foreground underline-offset-4 hover:underline"
              >
                {t('cross.rentalCta')}
              </Link>
            ) : (
              <span className="mt-1 cursor-default text-[13px] font-extrabold text-foreground/70">
                {t('cross.rentalCta')}
                <span className="sr-only"> ({t('cross.rentalKoOnly')})</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* FAQ (디자인 150–159행) — 대표 5문항 + 전체 FAQ 링크(결정 ②-A) */}
      <section className="mx-auto max-w-[900px] px-gutter pt-14">
        <h2 className="ks-display mb-5 text-[clamp(28px,4vw,44px)] leading-none text-foreground">
          {t('faq.heading')}
        </h2>
        {FAQ_KEYS.map((k) => (
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
              {t(`faq.${k}.a`)}
            </p>
          </details>
        ))}
        <Link
          href="/faq"
          className="mt-5 inline-block text-[13px] font-extrabold text-foreground underline-offset-4 hover:underline"
        >
          {t('faq.all')}
        </Link>
      </section>

      {/* CTA (디자인 162–171행) — 대형 헤드라인만 흰색(≥34px w800 = AA-large 통과, §11-W) */}
      <section className="mx-auto max-w-container-max px-gutter pb-16 pt-14">
        <div className="flex flex-wrap items-center justify-between gap-7 rounded-[24px] bg-primary p-[clamp(30px,5vw,60px)]">
          <h2 className="ks-display text-[clamp(34px,6vw,72px)] leading-[0.94] text-white">
            {t('cta.title1')}
            <br />
            {t('cta.title2')}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/experience"
              className="rounded-full bg-white px-[26px] py-[15px] text-[15px] font-extrabold text-foreground"
            >
              {t('cta.packages')}
            </Link>
            <Link
              href="/booking"
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
