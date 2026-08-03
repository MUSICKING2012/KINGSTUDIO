import { useTranslations } from 'next-intl';

import { FooterLocalePills } from '@/components/footer/footer-locale-pills';
import { FooterSocial } from '@/components/footer/footer-social';
import { Link } from '@/lib/i18n/navigation';
import { BUSINESS_INFO } from '@/lib/legal/business-info';
import { FOOTER_LINKS } from '@/lib/nav/footer-links';

/**
 * 에디토리얼 푸터 v2. 실측 소스 = claude.ai/design 프로젝트
 * `4823843e-9325-4bf9-8d38-4a409d5b59df` / `KING STUDIO Footer.dc.html`
 * (2026-07-31 DesignSync `get_file` 취득). 구 `ks-footer.js` 기반 v1을 대체한다.
 *
 * 구조: ① 상단 CTA 밴드 ② 중단 3컬럼(브랜드 / 링크 / 소셜·언어) ③ 하단 법정 바.
 *
 * ── 디자인 대비 의도적 델타 ──────────────────────────────────────────────
 * 1. **팔레트.** 디자인 accent 는 `#E8622C` 이나 브랜드 accent 는 `#F5461E`
 *    (CLAUDE §1 / DESIGN.md / globals.css `--primary`). `#E8622C` 는 Editorial 원본의
 *    `accentColor` prop 대체 옵션 중 하나로, 브랜드 정본이 아니다. -> 전부 `primary` 로 매핑.
 *    배경 `#181214` -> `bg-ink-footer`(푸터 배경 용도로 정의된 기존 토큰), 텍스트
 *    `#EDEAE6` -> `text-paper`. 신규 토큰은 추가하지 않는다.
 * 2. **WCAG(§3.9).** accent 채움 위 라벨 = 잉크(`text-foreground`). 흰 라벨은 3.63:1 로 AA 미달,
 *    잉크는 5.14:1. 다크 위 소형 텍스트 알파 하한 `/60`(6.43:1) — 디자인의 `.4`(3.41:1) 미채택.
 * 3. **이메일 캡처 제외.** 디자인 상단 밴드의 뉴스레터 입력은 마케팅 수신 동의를 발생시키므로
 *    PRD 동의 모듈(M5) + Gate 2 법무 감수 대상이다. `consents` append-only 는 하드 제약(§3.1)이라
 *    임시 구현이 그 경로를 우회하면 안 된다. -> mailto 만 남긴다
 *    (Home_Slice_Spec 결정 ⑤ 확정 = 제외·M5 이연, 동일 근거).
 * 4. **CTA 대상.** `#book-your-slot` 인페이지 앵커 -> `/booking`(실존 라우트).
 * 5. **법정 표기.** 디자인은 사업자 정보를 문자열로 하드코딩하지만 정본은
 *    `lib/legal/business-info.ts` 다. -> BUSINESS_INFO 로만 렌더한다. 디자인이 누락한
 *    개인정보책임자(전자상거래법 §10 필수)와 KRW 결제 고지(§3.2)는 v1 에서 승계해 유지한다.
 *    ⚠ 디자인 전화번호 `+82-2-6338-2428` 은 BUSINESS_INFO(`+82-2-6349-2429`)와 **불일치** —
 *    신고·등기 대조 대상이라 코드가 아니라 값 확인으로 해소한다. 레포 값을 유지했다.
 * 6. **컨테이너.** 디자인 1200px/28px -> `max-w-container-max`(1280) + `px-gutter`(24). 헤더와
 *    좌우 정렬이 어긋나면 안 되므로 사이트 공통 컨테이너를 따른다.
 * 7. **링크.** 디자인의 5링크 중 실존 라우트는 없다(`/policy/*`·`/info/*` 미존재). `FOOTER_LINKS`
 *    config 의 `enabled:false` 는 비인터랙티브 `<span>` 으로 렌더(죽은 링크 0, Nav 슬라이스 패턴).
 *    `/about` 은 디자인에 없지만 유일 인바운드 링크라 유지 — 근거는 `lib/nav/footer-links.ts`.
 */
export function SiteFooter() {
  const t = useTranslations('footer');
  const company = t('legal.company', {
    nameKo: BUSINESS_INFO.companyKo,
    nameEn: BUSINESS_INFO.companyEn,
  });

  return (
    <footer className="bg-ink-footer text-paper">
      {/* ① 상단 CTA 밴드 */}
      <div className="mx-auto max-w-container-max border-b border-primary/[0.28] px-gutter py-[clamp(44px,6vw,80px)]">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <h2 className="ks-display max-w-[14ch] text-[clamp(34px,5.5vw,68px)] leading-[0.96] tracking-[0.005em]">
            {t('ctaHeading')}
          </h2>
          <div className="flex min-w-[280px] flex-[0_1_380px] flex-col gap-3.5">
            <Link
              href="/booking"
              className="flex items-center justify-center gap-2 rounded-[13px] bg-primary px-[26px] py-4 text-[15.5px] font-extrabold text-foreground hover:brightness-[1.06]"
            >
              {t('ctaButton')} <span aria-hidden="true">→</span>
            </Link>
            <a
              href={`mailto:${BUSINESS_INFO.email}`}
              className="inline-flex min-h-[24px] items-center self-start text-[13px] text-paper underline-offset-4 hover:underline"
            >
              {t('orEmail')} {BUSINESS_INFO.email}
            </a>
          </div>
        </div>
      </div>

      {/* ② 중단 3컬럼 */}
      <div className="mx-auto grid max-w-container-max grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-10 px-gutter py-[clamp(38px,4.5vw,60px)]">
        {/* 브랜드 */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-[11px]">
            <span
              aria-hidden="true"
              className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-primary text-[18px] font-extrabold text-foreground"
            >
              K
            </span>
            <span className="ks-display text-[24px] tracking-[0.02em] text-paper">KING STUDIO</span>
          </div>
          <p className="max-w-[30ch] text-[14px] leading-[1.65] text-paper/60">{t('tagline')}</p>
          <span className="text-[12px] tracking-[0.04em] text-paper/60">{t('locationLine')}</span>
        </div>

        {/* 사이트 링크 */}
        <nav aria-label={t('exploreHeading')} className="flex flex-col gap-0.5">
          <span className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-paper/60">
            {t('exploreHeading')}
          </span>
          {FOOTER_LINKS.map((item) =>
            item.enabled ? (
              <Link
                key={item.key}
                href={item.href}
                className="py-[9px] text-[15px] font-medium text-paper hover:text-primary"
              >
                {t(`links.${item.key}`)}
              </Link>
            ) : (
              <span
                key={item.key}
                className="cursor-default py-[9px] text-[15px] font-medium text-paper/60"
              >
                {t(`links.${item.key}`)}
                <span className="sr-only"> ({t('comingSoon')})</span>
              </span>
            ),
          )}
        </nav>

        {/* 소셜 + 언어 */}
        <div className="flex flex-col gap-5">
          <div>
            <span className="mb-3.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-paper/60">
              {t('followHeading')}
            </span>
            <FooterSocial ariaTemplate={(name) => t('socialAria', { network: name })} />
          </div>
          <div>
            <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-paper/60">
              {t('languageHeading')}
            </span>
            <FooterLocalePills />
          </div>
        </div>
      </div>

      {/* ③ 하단 법정 바 — 전자상거래법 §10 표시사항. 값은 BUSINESS_INFO 단독 출처. */}
      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-container-max flex-wrap items-center justify-between gap-4 px-gutter py-5">
          <span className="text-[12.5px] text-paper/60">© 2026 KING STUDIO. {t('rights')}</span>
          <div className="flex flex-col gap-[3px] text-[11.5px] leading-[1.7] text-paper/60 md:text-right">
            <span>
              {company} · {t('legal.ceo')}: {BUSINESS_INFO.ceo} · {t('legal.bizNo')}:{' '}
              {BUSINESS_INFO.bizNo} · {t('legal.mailOrderNo')}: {BUSINESS_INFO.mailOrderNo} ·{' '}
              {t('legal.privacyOfficer')}: {BUSINESS_INFO.privacyOfficer}
            </span>
            <span>
              {t('legal.address')}: {BUSINESS_INFO.address} · {BUSINESS_INFO.tel}
            </span>
            <span>{t('legal.krwNotice')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
