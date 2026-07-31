import { useTranslations } from 'next-intl';

import { EditorialImage } from '@/components/home/editorial-image';
import { Link } from '@/lib/i18n/navigation';

/**
 * 에디토리얼 히어로. 실측 소스 = `design/KING STUDIO Editorial.dc.html` 52–82행.
 * 스펙 = `docs/specs/Home_Slice_Spec.md` §1 (슬라이스 4a).
 *
 * 타이포: C17 규약 — 대형 디스플레이는 `.ks-display` + arbitrary `text-[clamp(...)]`.
 * `edi-*` fontSize 토큰을 쓰지 않는 이유는 CJK 보정(`globals.css` 최하단)이 `.ks-display`
 * 셀렉터에만 걸려 있어, 토큰 경로로는 5로케일에서 어센더가 잘리기 때문이다(스펙 §0-B).
 *
 * 디자인 대비 의도적 델타 (전부 CLAUDE.md §3.9 / DESIGN.md WCAG 하드 제약):
 *  - accent 채움 위 라벨 `#fff` -> `text-foreground`. 12px·10px·15px 볼드는 WCAG large
 *    임계(18.66px 볼드) 미만이라 4.5:1 이 필요한데 흰 글자/accent 는 3.4:1 이다.
 *    ink/accent 는 약 5.1:1 로 통과(nav `Book now`·package-comparison 선례와 동일).
 *  - 라이트 서피스 소형 텍스트 알파 하한 = `/70`. 디자인의 `.5`(키커) `.55`(카드 부제)
 *    `.4`·`.25`(메타 행)는 전부 AA 미달이라 미채택.
 *  - 메타 행 뒤 2항목의 시각 위계는 색이 아니라 `font-semibold`(vs `font-bold`)로 낸다.
 *  - big2 는 accent 미적용(디자인 prop `secondWordAccent` 기본 false). accent 대형 헤드라인은
 *    Bolder 섹션 1곳으로 절제한다(스펙 결정 ⑧).
 *
 * NYT 기사 링크는 여기 두지 않는다 — 트러스트 스트립(슬라이스 4b)이 유일 진입점(스펙 결정 ⑦).
 */
const META_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

export function HeroSection() {
  const t = useTranslations('home.hero');

  return (
    <section id="top" className="mx-auto max-w-container-max px-gutter pt-[34px]">
      {/* 상단 행: 키커 + NYT 카드 (디자인 53–64행) */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex max-w-[220px] flex-col gap-0.5">
          <span className="text-[12px] font-semibold leading-[1.4] text-foreground/70">
            {t('kicker1')}
          </span>
          <span className="ks-display text-[clamp(22px,2.4vw,30px)] leading-[1.02] text-foreground">
            {t('kicker2')}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-ks-card border border-foreground/10 bg-card py-2 pl-[14px] pr-2">
          <div className="flex flex-col">
            <span className="text-[12px] font-bold text-foreground">{t('card.title')}</span>
            <span className="text-[11px] text-foreground/70">{t('card.sub')}</span>
          </div>
          <Link
            href="/booking"
            className="whitespace-nowrap rounded-[9px] bg-primary px-[15px] py-[9px] text-[12px] font-bold text-foreground"
          >
            {t('card.cta')}
          </Link>
        </div>
      </div>

      {/* 메타 행 (디자인 68–70행) */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 pt-[14px] text-[10.5px] uppercase tracking-[0.08em] text-foreground/70">
        {META_KEYS.map((key) => (
          <span key={key} className={key === 'e' || key === 'f' ? 'font-semibold' : 'font-bold'}>
            {t(`meta.${key}`)}
          </span>
        ))}
      </div>

      {/* 대형 디스플레이 + 오버랩 사진 (디자인 71–80행) */}
      <div className="relative flex flex-col items-center">
        <div className="ks-display w-full text-center text-[clamp(58px,14.5vw,200px)] text-foreground">
          {t('big1')}
        </div>

        <div className="relative z-[2] my-[-4vw] aspect-[3/3.4] w-[min(340px,72vw)] overflow-hidden rounded-ks-panel shadow-edi-photo">
          <EditorialImage alt={t('photoAlt')} className="h-full" />
          <span className="absolute left-[-30px] top-[32%] whitespace-nowrap rounded-[6px] bg-primary px-[14px] py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-foreground rotate-[-90deg]">
            {t('rotBadge')}
          </span>
          <span className="absolute bottom-[14px] left-1/2 w-[78%] -translate-x-1/2 rounded-[10px] bg-card px-[14px] py-[9px] text-center text-[11.5px] font-semibold text-foreground shadow-edi-caption">
            {t('photoCaption')}
          </span>
        </div>

        <div className="ks-display w-full text-center text-[clamp(58px,14.5vw,200px)] text-foreground">
          {t('big2')}
        </div>
      </div>
    </section>
  );
}
