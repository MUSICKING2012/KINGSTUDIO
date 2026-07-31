import { expect, test } from '@playwright/test';

/**
 * 헤더 nav 의 로케일 게이트 회귀 방지.
 *
 * 2026-07-31 실측 결함: nav "STUDIOS" 가 로케일과 무관하게 `/rental` 로 링크를 만들었다.
 * 1Hour·1Pro 는 `languagesAvailable = ['ko']` 이라 비-ko 에서 `CategoryCatalog` 가
 * `notFound()` 를 던지므로(`components/catalog/category-catalog.tsx:38-39`),
 * **사이트 전 페이지에서 4/5 로케일이 404 로 가는 링크**를 노출했다.
 *
 * 판정은 하드코딩 로케일 목록이 아니라 DB(`isCategoryVisibleForLocale`)가 한다. 그래서 이
 * 스펙도 로케일을 박아두지 않고 **실제 라우트 응답과 링크 존재를 대조**한다 — seed 의
 * `languagesAvailable` 이 바뀌면 둘이 함께 움직여야 한다.
 *
 * 전제: seed:packages 적용(1hour·1pro = ko 전용).
 */

const LOCALES = ['ko', 'en', 'ja', 'zh-HK', 'zh-CN'] as const;

for (const locale of LOCALES) {
  test(`헤더 STUDIOS 링크는 /rental 이 살아있는 로케일에만 — ${locale}`, async ({
    page,
    request,
  }) => {
    // 라우트가 실제로 200 인지 404 인지가 기준값이다.
    const routeOk = (await request.get(`/${locale}/rental`)).status() === 200;

    await page.goto(`/${locale}`);
    const header = page.locator('header');
    await expect(header).toBeVisible();

    const link = header.locator('a[href$="/rental"]');
    if (routeOk) {
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', `/${locale}/rental`);
    } else {
      // 404 로 가는 링크를 만들지 않는다. 항목 자체는 비링크로 남아 nav 5탭 구성은 유지된다.
      await expect(link).toHaveCount(0);
      const label = await page.locator('header nav').textContent();
      expect(label?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });
}

test('게이트가 막은 로케일에서도 nav 항목 수는 그대로다 (숨김이 아니라 비링크)', async ({
  page,
}) => {
  await page.goto('/ko');
  const ko = await page.locator('header nav > *').count();
  await page.goto('/en');
  const en = await page.locator('header nav > *').count();
  expect(en).toBe(ko);
});
