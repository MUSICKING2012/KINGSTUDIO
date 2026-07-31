import { useTranslations } from 'next-intl';

import { PackageCards } from '@/components/home/package-cards';

/**
 * FEELING BOLDER + 패키지 카드. 실측 소스 = `design/KING STUDIO Editorial.dc.html` 165–186행.
 * 스펙 = `docs/specs/Home_Slice_Spec.md` §5 (슬라이스 4d).
 *
 * 디자인은 헤드라인과 카드 그리드가 한 `<section>` 안에 있다. DB 를 읽는 카드 그리드만
 * `PackageCards`(async 서버 컴포넌트)로 분리하고, 섹션 껍데기와 헤드라인은 여기서 동기 렌더한다.
 *
 * accent 를 **텍스트 색으로** 쓰는 것이 허용되는 유일한 자리다(DESIGN.md "대형 헤드라인 스팟").
 * 최소 60px w900 이라 AA-large(3:1) 기준을 accent 3.4:1 로 통과한다. 다른 어디서도
 * accent 는 fill·보더·포커스링 전용이다(§11-W).
 *
 * `.ks-display` 가 letter-spacing .01em 을 주므로 `tracking-[-0.01em]` 유틸로 덮는다(유틸 우선).
 * CJK 에서는 globals.css 최하단이 letter-spacing:0 으로 재차 덮으므로 라틴에서만 -.01em 이
 * 적용된다 — 의도된 동작이다.
 */
export function BolderSection({ locale }: { locale: string }) {
  const t = useTranslations('home.bolder');

  return (
    <section className="mx-auto max-w-container-max px-gutter pb-[clamp(30px,4vw,52px)]">
      <div className="ks-display ks-display-strong text-[clamp(60px,15vw,210px)] tracking-[-0.01em] text-primary">
        {t('line1')}
        <br />
        <span className="inline-block pl-[18vw]">{t('line2')}</span>
      </div>

      <PackageCards locale={locale} />
    </section>
  );
}
