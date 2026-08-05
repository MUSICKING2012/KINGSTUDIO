import { expect, test } from '@playwright/test';

/**
 * STUDIOS 페이지 (시퀀스 5d-1 리네임 + 5d-2 레이아웃) 스모크 + 회귀 방지.
 *
 * 고정하는 것: ① 로케일별 상태 = 데이터 게이트 그대로 — ko 200 + h1, 비-ko 404
 * (1Hour·1Pro ko 전용 — 리네임·레이아웃이 게이트를 깨지 않는다)
 * ② 구 URL 보존 — /rental 이 /studios 로 308 (체인 없이 직결, 전 로케일 동일 타깃)
 * ③ 비-ko 는 리다이렉트 추적 후에도 최종 404 (리네임 전 /rental 직접 404 와 동작 동일)
 * ④ 5d-2 레이아웃 — 대여 카드가 DB 가격(KRW)을 렌더하고(하드코딩 금지의 실측면),
 *    CTA 가 /product 로 연결된다. 이연 섹션(장비·팀)은 fill-in 도착 전 존재하지 않아야 한다.
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
}

test('5d-2 레이아웃 — 대여 카드는 DB 가격을 렌더하고 CTA 는 /product 로 간다 (ko)', async ({
  page,
}) => {
  await page.goto('/ko/studios');
  // 대여 카드 = KRW 표기를 포함한 article(formatKrw 산출). seed 는 1Hour·1Pro 2종이지만
  // 카드 수는 DB 를 따르므로 "1개 이상 + 전 카드 KRW 포함"으로 고정(표시가 데이터를 앞서지 않는다).
  const priceCards = page.locator('main article').filter({ hasText: 'KRW' });
  const priceCount = await priceCards.count();
  expect(priceCount).toBeGreaterThan(0);
  await expect(page.locator('main article')).toHaveCount(priceCount);
  // CTA 패널 → /product (See packages) + /product#bookbar (Book).
  await expect(page.locator('main a[href="/ko/product"]')).toHaveCount(1);
  await expect(page.locator('main a[href="/ko/product#bookbar"]')).toHaveCount(1);
});

for (const locale of LOCALES) {
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
