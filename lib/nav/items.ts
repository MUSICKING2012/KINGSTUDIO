import type { PackageCategory } from '@prisma/client';

/**
 * 상단 nav 항목. 디자인(KING STUDIO Editorial.dc.html) nav 5항목.
 *
 * 목적지 라우트는 전부 미존재 → enabled:false 로 비활성 렌더.
 * (미존재 링크는 app/[locale]/[...rest] catch-all 로 빨려들어가 오답 페이지를 낸다.
 *  404 보다 나쁘므로 링크 자체를 만들지 않는다.)
 *
 * studios 는 5d-1 에서 /studios 로 확정(구 /rental 은 308 리다이렉트).
 * product 는 5c 에서 /product 로 확정(구 /experience 는 308 리다이렉트).
 *
 * My Page(재방문 조건부) = components/header/my-page-nav-item.tsx (ks_returning=1 쿠키 게이팅).
 * 쿠키 세팅 주체는 My Page/매직링크 슬라이스 소관.
 */
export type NavItem = {
  key: 'service' | 'studios' | 'product' | 'reviews' | 'blog';
  href: string;
  enabled: boolean;
  /**
   * 이 카테고리 상품이 노출되는 로케일에서만 링크로 렌더한다. 나머지는 `enabled:false` 와
   * 같은 비링크 `<span>`.
   *
   * 판정은 하드코딩 로케일 목록이 아니라 DB(`isCategoryVisibleForLocale`)로 한다 —
   * `languagesAvailable` 이 바뀌면 자동으로 따라간다(Home_Slice_Spec §4-C 원칙).
   *
   * studios 의 게이트는 5d-3 에서 해제 — `/studios` 가 전 로케일 소개 페이지(200)로
   * 전환됐다(`Studio_Slice_Spec.md` §4-B). 대여 카탈로그 시절(5d-1~2)의 비-ko 404 게이트
   * 이력은 위 스펙 §2-① 참조. 현재 이 필드를 쓰는 항목은 없지만, 로케일 제한 카테고리
   * 라우트가 다시 생기면 재사용한다.
   */
  localeGatedCategory?: PackageCategory;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'service', href: '/service', enabled: true }, // 5a 에서 켬 (라우트 신설)
  { key: 'studios', href: '/studios', enabled: true }, // 5d-1 URL 확정 · 5d-3 전 로케일 전환(게이트 해제)
  { key: 'product', href: '/product', enabled: true }, // 5c 에서 최종 URL 확정
  { key: 'reviews', href: '/reviews', enabled: true }, // 5b 에서 켬 (라우트 신설)
  // 5e-2: Ghost 이관 완료로 활성(빈 목록 회피 게이트 해제 — Blog_Slice_Spec §2-ⓐ).
  { key: 'blog', href: '/blog', enabled: true },
] as const;
