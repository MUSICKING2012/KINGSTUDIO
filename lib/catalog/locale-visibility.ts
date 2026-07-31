import { unstable_cache } from 'next/cache';

import { prisma } from '@/lib/db/prisma';
import { toPrismaLocale } from '@/lib/i18n/locale';
import type { Locale } from '@/lib/i18n/routing';
import type { PackageCategory } from '@prisma/client';

/**
 * "이 로케일에 이 카테고리의 상품이 하나라도 노출되는가" 판정.
 *
 * 용도: 공용 nav 처럼 **모든 라우트에 깔리는 UI** 가 로케일별 라우트 존재 여부를 알아야 할 때.
 * 예) `/rental` 은 1Hour·1Pro 가 `languagesAvailable = ['ko']` 이라 비-ko 에서
 * `CategoryCatalog` 가 `notFound()` 를 던진다(`components/catalog/category-catalog.tsx:38-39`).
 * 그 라우트로 링크를 걸면 4/5 로케일에서 404 가 된다.
 *
 * ── 왜 `unstable_cache` 인가 ──────────────────────────────────────────
 * 판정은 데이터 기반이어야 한다(하드코딩 로케일 allow-list 금지 — Home_Slice_Spec §4-C).
 * 그런데 이 조회가 `app/[locale]/layout.tsx` 의 헤더에서 일어나면, 캐시 없이는 **정적
 * 프리렌더되던 라우트가 전부 dynamic 으로 강등**된다(2026-07-31 실측 기준 28개:
 * about·faq·login·signup·packages ×5로케일 + admin/login + robots + sitemap).
 *
 * `unstable_cache` 는 결과를 데이터 캐시에 올려 프리렌더 중에도 쓸 수 있게 하므로,
 * 위 라우트들이 정적으로 남는다. 대가는 `revalidate` 주기만큼의 반영 지연이다.
 *
 * ── 실패를 캐시하지 않는다 ────────────────────────────────────────────
 * 캐시 함수 안에서는 에러를 삼키지 않고 그대로 던진다. 삼켜서 빈 결과를 돌려주면 **DB 장애
 * 순간의 "노출 없음" 이 revalidate 주기 내내 굳는다.** 호출측이 catch 해서 그때만 강등한다.
 */

/** 상품 노출 판정의 반영 지연 상한(초). 가격·노출은 어드민이 드물게 바꾸는 저빈도 데이터다. */
export const CATEGORY_LOCALE_REVALIDATE = 3600;

/** 캐시 태그 — 어드민에서 패키지를 바꾼 뒤 `revalidateTag` 로 즉시 무효화할 수 있다. */
export const PACKAGE_VISIBILITY_TAG = 'package-visibility';

const loadLocalesWithCategory = unstable_cache(
  async (category: PackageCategory): Promise<string[]> => {
    // 에러는 던진다(위 docblock 참조) — 실패한 결과를 캐시에 남기지 않기 위함.
    const rows = await prisma.package.findMany({
      where: { isActive: true, category },
      select: { languagesAvailable: true },
    });
    // Prisma enum 식별자(zh_HK) 그대로 모은다 — 비교도 식별자 기준으로 한다.
    return [...new Set(rows.flatMap((r) => r.languagesAvailable as unknown as string[]))];
  },
  ['catalog', 'locales-with-category'],
  { revalidate: CATEGORY_LOCALE_REVALIDATE, tags: [PACKAGE_VISIBILITY_TAG] },
);

/**
 * 해당 로케일에 `category` 상품이 노출되는지. 조회 실패 시 **false**(= 링크 미생성)로 강등한다.
 *
 * 강등 방향이 false 인 이유: 오판으로 링크를 만들면 사용자가 404 를 맞지만, 링크를 안 만들면
 * 최악이 "해당 로케일 사용자가 다른 동선으로 우회" 다. 죽은 링크 0 원칙(Nav 스펙 §7-④).
 */
export async function isCategoryVisibleForLocale(
  category: PackageCategory,
  locale: Locale,
): Promise<boolean> {
  try {
    const locales = await loadLocalesWithCategory(category);
    return locales.includes(toPrismaLocale(locale));
  } catch (e) {
    console.error(`[catalog/locale-visibility] ${category} lookup failed, treating as hidden:`, e);
    return false;
  }
}
