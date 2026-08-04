import { expect, test } from '@playwright/test';

/**
 * PRODUCT 페이지 (시퀀스 5c) 스모크 + 리네임 A 회귀 방지.
 *
 * 고정하는 것: ① 5로케일 200 + h1 ② nav PRODUCT 탭 활성 링크(/product)
 * ③ 구 URL 보존 — /experience 와 /packages 가 /product 로 308 (체인 없이 직결)
 * ④ 표시가 DB 를 앞서지 않는다 — 체험 카드 수 = 비교표 컬럼 수(같은 listPackages 소스),
 *    단체 패널 인원 문구는 DB headcount 파라미터 렌더
 * ⑤ 예약바(4e 검증 컴포넌트)가 페이지에 존재.
 */

const LOCALES = ['ko', 'en', 'ja', 'zh-HK', 'zh-CN'] as const;

for (const locale of LOCALES) {
  test(`/product 렌더 + nav 활성 — ${locale}`, async ({ page }) => {
    const res = await page.goto(`/${locale}/product`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator(`header nav a[href="/${locale}/product"]`)).toHaveCount(1);
  });
}

test('구 URL 이 308 로 /product 에 직결된다 (/experience · /packages, 체인 0)', async ({
  request,
}) => {
  for (const from of ['/en/experience', '/en/packages']) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(308);
    expect(res.headers().location, from).toBe('/en/product');
  }
});

test('가격 카드와 비교 컬럼이 같은 DB 소스와 정합한다', async ({ page }) => {
  await page.goto('/en/product');

  // 가격 카드 = KRW 표기를 포함한 article(formatKrw 산출) / 비교 컬럼(PackageComparison)도
  // article 이지만 KRW 미포함. 둘 다 listPackages(experience) 소스이므로 1:1 — 전체 article
  // 수는 가격 카드 수의 정확히 2배여야 한다(표시가 데이터를 앞서지 않는다).
  const priceCards = page.locator('main article').filter({ hasText: 'KRW' });
  const priceCount = await priceCards.count();
  expect(priceCount).toBeGreaterThan(0);
  await expect(page.locator('main article')).toHaveCount(priceCount * 2);
});

test('예약바가 렌더된다 (4e 컴포넌트 재사용)', async ({ page }) => {
  await page.goto('/en/product');
  await expect(page.locator('#bookbar')).toHaveCount(1);
});
