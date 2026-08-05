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
   * `/studios`(구 /rental) 는 1Hour·1Pro 가 `languagesAvailable = ['ko']`
   * (`prisma/seed-packages.ts`) 이라 비-ko 에서 `CategoryCatalog` 가 `notFound()` 를 던진다
   * (`components/catalog/category-catalog.tsx:38-39`). 2026-07-31 실측(구 URL):
   * ko 200 · en|ja|zh-HK|zh-CN 404. 무조건 링크하면 헤더가 layout 에
   * 있어 **사이트 전 페이지에서 4/5 로케일이 404 로 가는 링크**를 노출한다.
   *
   * 판정은 하드코딩 로케일 목록이 아니라 DB(`isCategoryVisibleForLocale`)로 한다 —
   * `languagesAvailable` 이 바뀌면 자동으로 따라간다(Home_Slice_Spec §4-C 원칙).
   */
  localeGatedCategory?: PackageCategory;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'service', href: '/service', enabled: true }, // 5a 에서 켬 (라우트 신설)
  { key: 'studios', href: '/studios', enabled: true, localeGatedCategory: 'rental' }, // 5d-1 에서 최종 URL 확정
  { key: 'product', href: '/product', enabled: true }, // 5c 에서 최종 URL 확정
  { key: 'reviews', href: '/reviews', enabled: true }, // 5b 에서 켬 (라우트 신설)
  { key: 'blog', href: '/blog', enabled: false },
] as const;
