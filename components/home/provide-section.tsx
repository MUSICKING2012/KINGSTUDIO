import { useTranslations } from 'next-intl';

import { EditorialImage } from '@/components/home/editorial-image';
import { Marquee } from '@/components/home/marquee';
import { Link } from '@/lib/i18n/navigation';

/**
 * Provide — 다크 섹션. 실측 소스 = `design/KING STUDIO Editorial.dc.html` 96–133행.
 * 스펙 = `docs/specs/Home_Slice_Spec.md` §3 (슬라이스 4b).
 *
 * 서피스: `bg-ink-deep`(#111010) + `text-paper`. 푸터가 `ink-footer`(#0b0a0a)를 쓰므로
 * 디자인의 3단 잉크 톤이 그대로 성립한다(OPEN DECISION ⑧ = 선택지 C 로 자연 귀결).
 * `.dark` 클래스는 쓰지 않는다 — shadcn 기본 slate 가 남아 있어 DESIGN.md 가 금지한다.
 *
 * `id="about"` 은 in-page 앵커이지 `/about` 라우트가 아니다(프래그먼트라 충돌 없음).
 *
 * 디자인 대비 의도적 델타:
 *  - accent 채움 위 라벨 `#fff` -> `text-foreground`(§11-W). 12px 볼드는 WCAG large
 *    임계 미만이라 4.5:1 필요, 흰 글자는 3.4:1.
 *  - 마퀴 `rgba(240,238,233,.35)`(계산 ≈3.03:1, large 임계 3:1 경계) -> `/45`(≈4.1:1).
 *  - 다크 위 소형 텍스트 알파 하한 `/60`. 디자인의 `.5` 는 미채택.
 *  - 태그 칩에서 **가격 문자열 제거**(디자인 `darkTags` 의 `Gold ₩400K` 류). 가격은 DB 가
 *    정본이라 카피에 하드코딩할 수 없다(CLAUDE §6 / 토큰 스펙 §8). 칩 라벨은 기존
 *    `packages.items.*.name` 재사용 — 신규 카피도 DB 조회도 불필요.
 *
 * `slotsLabel` 의 "D+1 → 90" 은 데모 값이 아니라 실 정책이다
 * (`lib/slots/window.ts:11-12` BOOKING_MIN_OFFSET=1 / BOOKING_MAX_OFFSET=90 과 일치).
 * 단 숫자는 카피에만 존재하고, 실제 날짜 범위 계산은 `bookingWindow()` 가 소유한다.
 *
 * 마퀴 정지(`prefers-reduced-motion: reduce`)는 `app/globals.css` 최하단에 이미 있다.
 */

// 태그 칩 4종 — `packages.items.<slug>.name` 을 그대로 읽는다(카탈로그·예약과 단일 출처).
// 강조 1칸(디자인 index 1 = Diamond)은 순수 장식이라 §3.9 "색만으로 정보 전달" 비해당.
const TAG_SLUGS = ['gold', 'diamond', 'premium', 'making-class'] as const;
const ACCENT_TAG = 'diamond';

// 마퀴는 width:max-content 상태로 -50% 이동하므로 콘텐츠가 정확히 2배(= 4벌 중 2벌 폭)여야
// 이음매가 보이지 않는다. 디자인 110행의 4벌 복제를 그대로 따른다.
const MARQUEE_COPIES = [0, 1, 2, 3];

export function ProvideSection() {
  const t = useTranslations('home.provide');
  const tp = useTranslations('packages.items');

  return (
    <section id="about" className="relative overflow-hidden bg-ink-deep text-paper">
      <div className="mx-auto max-w-container-max px-gutter py-[clamp(40px,6vw,72px)]">
        {/* 헤딩 블록 (디자인 98–104행) */}
        <div className="flex flex-wrap items-start justify-between gap-10">
          <h2 className="ks-display max-w-[680px] text-[clamp(30px,4.6vw,60px)] leading-[1.02]">
            {t('titlePre')} <span className="text-primary">—</span> {t('titlePost')}
          </h2>
          <div className="flex max-w-[300px] flex-col gap-4">
            <p className="text-[14px] leading-[1.7] text-paper/70">{t('body')}</p>
            <a
              href="#sessions"
              className="flex items-center gap-2 text-[13px] font-extrabold tracking-[0.06em] text-paper"
            >
              {t('learnMore')}{' '}
              <span aria-hidden="true" className="text-primary">
                ↗
              </span>
            </a>
          </div>
        </div>

        {/* 마퀴 (디자인 107–113행). Marquee 래퍼가 화면 밖에서 애니메이션을 일시정지한다
            — 무한 애니메이션이 CPU 유휴를 막아 Lighthouse 성능 77(Gate 3 미달)을 만들었던
            원인(marquee.tsx docblock 실측 근거 참조). */}
        <div className="my-[34px] overflow-hidden border-y border-paper/[0.14] py-[14px]">
          <Marquee>
            {MARQUEE_COPIES.map((i) => (
              <span
                key={i}
                aria-hidden={i > 0 ? 'true' : undefined}
                className="ks-display px-[22px] text-[19px] text-paper/45"
              >
                {t('marquee')}
              </span>
            ))}
          </Marquee>
        </div>

        {/* 이미지 + 태그 + LOVE (디자인 115–131행) */}
        <div className="flex flex-wrap items-center justify-between gap-[34px]">
          <div className="flex min-w-[260px] flex-1 flex-col gap-[14px]">
            <div className="relative aspect-[16/11] w-[min(360px,80vw)] overflow-hidden rounded-ks-panel bg-ink-raise">
              <EditorialImage alt={t('imageAlt')} className="h-full bg-ink-raise" />
              <div className="absolute bottom-[14px] left-[14px] rounded-[10px] bg-ink-deep/60 px-[14px] py-[10px] backdrop-blur-[6px]">
                <div className="text-[11px] font-bold tracking-[0.06em] text-paper/70">
                  {t('slotsLabel')}
                </div>
                <Link
                  href="/booking"
                  className="mt-2 inline-block rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-foreground"
                >
                  {t('bookCta')}
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {TAG_SLUGS.map((slug) => (
                <span
                  key={slug}
                  className={
                    slug === ACCENT_TAG
                      ? 'rounded-full border border-transparent bg-primary px-[15px] py-2 text-[11.5px] font-semibold text-foreground'
                      : 'rounded-full border border-paper/25 px-[15px] py-2 text-[11.5px] font-semibold text-paper/80'
                  }
                >
                  {tp(`${slug}.name`)}
                </span>
              ))}
            </div>
          </div>

          <div className="ks-display flex-none text-right text-[clamp(34px,5.4vw,74px)] leading-[0.98]">
            {t('love1')}
            <br />
            <span className="text-primary">—</span> {t('love2')}
            <br />
            {t('love3')}
          </div>
        </div>
      </div>
    </section>
  );
}
