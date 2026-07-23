/**
 * 상단 nav 항목. 디자인(KING STUDIO Editorial.dc.html) nav 5항목.
 *
 * 목적지 라우트는 전부 미존재 → enabled:false 로 비활성 렌더.
 * (미존재 링크는 app/[locale]/[...rest] catch-all 로 빨려들어가 오답 페이지를 낸다.
 *  404 보다 나쁘므로 링크 자체를 만들지 않는다.)
 *
 * ⚠ 라벨↔기존 라우트가 1:1이 아니다. /rental·/experience·/group 이 이미 있으나
 *    studios·product 가 그것들의 최종 URL인지 미확정 → 임의 매핑 금지.
 *    라우트 슬라이스에서 URL이 확정될 때마다 href 와 enabled 를 함께 고친다.
 *
 * My Page(재방문 조건부)는 범위 밖 — ks_returning 마커 설정 주체 확정 후 로그인 슬라이스에서 추가.
 */
export type NavItem = {
  key: 'service' | 'studios' | 'product' | 'reviews' | 'blog';
  href: string;
  enabled: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'service', href: '/service', enabled: false },
  { key: 'studios', href: '/studios', enabled: false },
  { key: 'product', href: '/product', enabled: false },
  { key: 'reviews', href: '/reviews', enabled: false },
  { key: 'blog', href: '/blog', enabled: false },
] as const;
