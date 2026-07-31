import { useTranslations } from 'next-intl';

import { EditorialImage } from '@/components/home/editorial-image';

/**
 * Boost. 실측 소스 = `design/KING STUDIO Editorial.dc.html` 231–241행.
 * 스펙 = `docs/specs/Home_Slice_Spec.md` §7 (슬라이스 4b).
 *
 * 브래킷 글리프 `[` `]` 는 순수 장식이고 `aria-hidden` 이므로 WCAG 1.4.3(대비) 적용 대상이
 * 아니다 — 디자인의 `rgba(20,18,16,.35)` 를 그대로 쓴다. 본문 `/70` 은 계산 6.2:1 로 통과.
 *
 * 이 섹션에는 제품 사실(가격·인원·소요시간·전달물)이 없다 — 정서 카피뿐이라
 * PRD 대조에서 검출 항목 0건(§13-A STEP 1-A 결과).
 */
export function BoostSection() {
  const t = useTranslations('home.boost');

  return (
    <section className="mx-auto max-w-container-max px-gutter pb-[clamp(30px,4vw,48px)]">
      <div className="ks-display text-center text-[clamp(30px,5.2vw,68px)] leading-[1]">
        {t('line')}
      </div>

      <div className="flex items-center justify-center gap-[clamp(10px,3vw,40px)] pb-[22px] pt-[26px]">
        <span
          aria-hidden="true"
          className="text-[clamp(50px,9vw,120px)] font-normal leading-[0.8] text-foreground/35"
        >
          [
        </span>
        <div className="aspect-[3/3.2] w-[min(300px,60vw)] overflow-hidden rounded-ks-img">
          <EditorialImage alt={t('imageAlt')} className="h-full" />
        </div>
        <span
          aria-hidden="true"
          className="text-[clamp(50px,9vw,120px)] font-normal leading-[0.8] text-foreground/35"
        >
          ]
        </span>
      </div>

      <p className="mx-auto max-w-[720px] text-center text-[14px] leading-[1.7] text-foreground/70 [text-wrap:pretty]">
        {t('body')}
      </p>
    </section>
  );
}
