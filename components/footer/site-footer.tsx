import { useTranslations } from 'next-intl';

import { Link } from '@/lib/i18n/navigation';
import { BUSINESS_INFO } from '@/lib/legal/business-info';

/**
 * 에디토리얼 푸터. 실측 소스 = King Studio V3 프로젝트 ks-footer.js.
 *
 * 전자상거래법 §10 표시사항: 상호·대표자·사업자등록번호·주소·통신판매업신고번호·
 * 개인정보책임자·연락처. 값은 lib/legal/business-info.ts 단일 출처(번역 대상 아님),
 * 라벨만 messages/*.json footer.legal.* 로 번역한다.
 * ⚠ 호스팅서비스 제공자 표시(§10 필수)는 인프라 확정 후 추가 — 현재 결손.
 *
 * 디자인 대비 의도적 델타:
 *  - 배경 #0b0a0a -> bg-foreground (DESIGN.md 다크 서피스 하드 규칙, .dark 클래스 사용 금지)
 *  - 법정고지 opacity .5 -> /60 (11.5px 는 large text 아님 → 4.5:1 요구, .5 는 4.6:1 경계선)
 *  - Terms/Privacy/Refund 는 href="#" 더미라 미채택. About·FAQ 는 유일 진입점이라 유지.
 *    /packages 는 실측 308(permanentRedirect) 이므로 /experience 직결.
 *  - tagline / companyHeading 은 렌더하지 않되 i18n 키는 존치.
 *  - 타이포는 C17 규약대로 arbitrary value. 브랜드는 .ks-display-strong 티어.
 */
export function SiteFooter() {
  const t = useTranslations('footer');
  const company = t('legal.company', {
    nameKo: BUSINESS_INFO.companyKo,
    nameEn: BUSINESS_INFO.companyEn,
  });

  return (
    <footer className="mt-section-gap bg-foreground text-background/70">
      <div className="mx-auto flex max-w-container-max flex-col gap-5 px-gutter py-[34px]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="ks-display ks-display-strong text-[18px] text-background">
              KING STUDIO
            </span>
            <span className="text-[12px]">
              {BUSINESS_INFO.email} · {BUSINESS_INFO.tel}
            </span>
            <span className="text-[12px]">{t('operatedBy', { company })}</span>
          </div>

          <nav
            aria-label={t('exploreHeading')}
            className="flex flex-wrap gap-5 text-[12px] font-bold tracking-[0.04em] text-background/80"
          >
            <Link href="/experience">{t('packages')}</Link>
            <Link href="/songs">{t('songs')}</Link>
            <Link href="/about">{t('about')}</Link>
            <Link href="/faq">{t('faq')}</Link>
          </nav>
        </div>

        <div className="flex flex-col gap-[5px] border-t border-background/[0.12] pt-4 text-[11.5px] leading-[1.7] text-background/60">
          <span>
            {company} · {t('legal.ceo')}: {BUSINESS_INFO.ceo} · {t('legal.bizNo')}:{' '}
            {BUSINESS_INFO.bizNo} · {t('legal.mailOrderNo')}: {BUSINESS_INFO.mailOrderNo} ·{' '}
            {t('legal.privacyOfficer')}: {BUSINESS_INFO.privacyOfficer}
          </span>
          <span>
            {t('legal.address')}: {BUSINESS_INFO.address}
          </span>
          <span>{t('legal.krwNotice')}</span>
          <span>© 2026 KING STUDIO. {t('rights')}</span>
        </div>
      </div>
    </footer>
  );
}
