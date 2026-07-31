import { useTranslations } from 'next-intl';

/**
 * 트러스트 스트립. 실측 소스 = `design/KING STUDIO Editorial.dc.html` 86–92행.
 * 스펙 = `docs/specs/Home_Slice_Spec.md` §2 (슬라이스 4b).
 *
 * 디자인은 `press` 5칸을 나열하지만 **실 자산은 NYT 1건뿐**이다(원문 592–593행의
 * Seoul Beat·K-Culture·Visit Seoul·Soundmag 는 데모 문자열, href 는 `#nyt-article-url`
 * placeholder). 결정 ② = A(NYT 단독) 확정 — 존재하지 않는 매체를 로고 열처럼 나열하는 것은
 * 허위 표시라 §11-D 이식 금지 대상이다. 실 자산이 확인되면 배열 상수 + i18n 키 쌍으로
 * 되살리되, URL 없는 항목은 `<a>` 가 아니라 `<span>` 으로 렌더한다(죽은 링크 0).
 *
 * 디자인 대비 의도적 델타:
 *  - 항목 색 `rgba(20,18,16,.32)`(계산 ≈1.9:1) 미채택. 15px 볼드는 WCAG large 임계
 *    (18.66px 볼드) 미만이라 4.5:1 이 필요하다 → 본문 `text-foreground`, 보조 `/70`.
 *
 * 카피는 기존 `home.nyt.*` 3키를 그대로 소비한다(5로케일 품질 양호 — §9-0 존치).
 */

// The New York Times feature (PRD §1). 외부·로케일 무관이라 i18n 대상이 아니다.
// ⚠ 같은 상수가 `app/[locale]/(public)/about/page.tsx:12` 에도 있다(2중 정의).
// 통합은 이 슬라이스 범위 밖 — 스펙 §12-5 기록.
const NYT_URL = 'https://www.nytimes.com/2024/11/29/fashion/k-pop-recording-sessions-seoul.html';

export function TrustStrip() {
  const t = useTranslations('home.nyt');

  return (
    <section className="mx-auto mt-[26px] max-w-container-max border-y border-foreground/10 px-gutter py-[26px]">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/70">
          {t('label')}
        </p>
        <a
          href={NYT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-wrap items-baseline gap-x-4 gap-y-1"
        >
          <span className="text-[15px] font-extrabold text-foreground">{t('source')}</span>
          <span className="text-[12px] font-semibold text-foreground/70 underline-offset-4 group-hover:underline">
            {t('cta')} <span aria-hidden="true">↗</span>
          </span>
        </a>
      </div>
    </section>
  );
}
