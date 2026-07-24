/**
 * 상단 nav 항목. 디자인(KING STUDIO Editorial.dc.html) nav 5항목.
 *
 * 목적지 라우트는 전부 미존재 → enabled:false 로 비활성 렌더.
 * (미존재 링크는 app/[locale]/[...rest] catch-all 로 빨려들어가 오답 페이지를 낸다.
 *  404 보다 나쁘므로 링크 자체를 만들지 않는다.)
 *
 * studios→/rental, product→/experience 는 임시 href (Nav_Footer_Slice_Spec_v1 §7-① 채택,
 * 07-24 통합 결정): 라우트 실존 확인됨. STUDIOS/PRODUCT 페이지 슬라이스가 최종 URL 확정 시
 * href 를 갱신한다(이동 시 리다이렉트 동반). 나머지 3항목은 라우트 미존재 → enabled:false.
 *
 * My Page(재방문 조건부) = components/header/my-page-nav-item.tsx (ks_returning=1 쿠키 게이팅).
 * 쿠키 세팅 주체는 My Page/매직링크 슬라이스 소관.
 */
export type NavItem = {
  key: 'service' | 'studios' | 'product' | 'reviews' | 'blog';
  href: string;
  enabled: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'service', href: '/service', enabled: false },
  { key: 'studios', href: '/rental', enabled: true }, // STUDIOS slice renames to final URL
  { key: 'product', href: '/experience', enabled: true }, // PRODUCT slice renames to final URL
  { key: 'reviews', href: '/reviews', enabled: false },
  { key: 'blog', href: '/blog', enabled: false },
] as const;
