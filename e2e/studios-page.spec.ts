import { expect, test } from '@playwright/test';

/**
 * STUDIOS 페이지 (시퀀스 5d-1 리네임) 스모크 + 리네임 A 회귀 방지.
 *
 * 고정하는 것: ① 로케일별 상태 = 데이터 게이트 그대로 — ko 200 + h1, 비-ko 404
 * (1Hour·1Pro ko 전용, `CategoryCatalog` notFound — 리네임이 게이트를 깨지 않는다)
 * ② 구 URL 보존 — /rental 이 /studios 로 308 (체인 없이 직결, 전 로케일 동일 타깃)
 * ③ 비-ko 는 리다이렉트 추적 후에도 최종 404 (리네임 전 /rental 직접 404 와 동작 동일).
 *
 * 전제: seed:packages (1hour·1pro = ko 전용).
 */

const LOCALES = ['ko', 'en', 'ja', 'zh-HK', 'zh-CN'] as const;

for (const locale of LOCALES) {
  test(`/studios 로케일 게이트 — ${locale}`, async ({ page, request }) => {
    // 데이터 게이트가 기준값이다(하드코딩 로케일 목록 금지) — seed 기준 ko 만 rental 노출.
    const res = await request.get(`/${locale}/studios`);
    if (res.status() === 200) {
      await page.goto(`/${locale}/studios`);
      await expect(page.locator('main h1')).toBeVisible();
      // nav STUDIOS 탭이 이 로케일에선 활성 링크다(최종 URL).
      await expect(page.locator(`header nav a[href="/${locale}/studios"]`)).toHaveCount(1);
    } else {
      expect(res.status(), `${locale} 는 rental 미노출 로케일 — 404 여야 한다`).toBe(404);
    }
  });

  test(`구 /rental 이 308 로 /studios 에 직결된다 (체인 0) — ${locale}`, async ({ request }) => {
    const res = await request.get(`/${locale}/rental`, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers().location).toBe(`/${locale}/studios`);
  });
}

test('ko 는 구 URL 로 들어와도 최종 200, 비-ko 는 최종 404 (리다이렉트 후 게이트 유지)', async ({
  request,
}) => {
  expect((await request.get('/ko/rental')).status()).toBe(200);
  expect((await request.get('/en/rental')).status()).toBe(404);
});
