/**
 * 푸터 링크 config. 실측 소스 = claude.ai/design 프로젝트 `4823843e-9325-4bf9-8d38-4a409d5b59df`
 * 의 `KING STUDIO Footer.dc.html`(2026-07-31 DesignSync `get_file` 취득) `renderVals().links`.
 *
 * NAV_ITEMS(`lib/nav/items.ts`)와 동일 패턴: `enabled:false` 는 링크가 아니라 비인터랙티브
 * `<span>` 으로 렌더한다. 미존재 라우트로 링크를 만들면 `app/[locale]/[...rest]` catch-all 이
 * 받아 404 보다 나쁜 오답 페이지가 된다(Nav_Footer_Slice_Spec §7-④).
 *
 * ⚠ `inquery` 철자는 **의도적**이다 — 디자인 파일 상단 개발자 노트가 "keep this exact spelling
 *   everywhere; do NOT correct to 'inquiry'" 라고 명시. 라우트 신설 시에도 이 철자를 유지할 것.
 *
 * ⚠ about 은 디자인 링크 목록에 없지만 **유지**한다. 07-31 실측상 `/about` 과 `/faq` 의 유일한
 *   인바운드 링크가 푸터이므로, 디자인대로 지우면 `/about` 이 어느 화면에서도 도달 불가가 된다.
 *   `/info/partners` 등 디자인이 전제한 신규 라우트가 생기면 그때 재정리.
 */
export type FooterLink = {
  key: 'terms' | 'privacy' | 'partners' | 'about' | 'faq' | 'contact';
  href: string;
  enabled: boolean;
};

export const FOOTER_LINKS: readonly FooterLink[] = [
  // 약관·개인정보: 라우트 미존재 + C15 법무 대기 → legal 슬라이스가 켠다.
  { key: 'terms', href: '/policy/service', enabled: false },
  { key: 'privacy', href: '/policy/privacy', enabled: false },
  { key: 'partners', href: '/info/partners', enabled: false },
  { key: 'about', href: '/about', enabled: true },
  { key: 'faq', href: '/faq', enabled: true },
  { key: 'contact', href: '/info/inquery', enabled: false }, // 'inquery' 철자 의도적
] as const;
