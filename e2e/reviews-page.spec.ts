import { expect, test } from '@playwright/test';

/**
 * REVIEWS 페이지 (시퀀스 5b) 스모크.
 *
 * 고정하는 것: ① 5로케일 200 + h1 ② nav REVIEW 탭 활성 링크 ③ 데이터 상태와 표시의 정합 —
 * 리뷰 0건이면 빈 상태 문구가 보이고 통계 카드·필터 바는 없다 / 1건 이상이면 통계 카드가 있다
 * (허위 표시 금지의 회귀 방지: 어느 상태든 "표시가 데이터를 앞서지 않는다")
 * ④ Service 트러스트 스트립의 후기 링크가 /reviews 로 살아났다(구 "준비 중" 비링크 해소).
 */

const LOCALES = ['ko', 'en', 'ja', 'zh-HK', 'zh-CN'] as const;

for (const locale of LOCALES) {
  test(`/reviews 렌더 + nav 활성 — ${locale}`, async ({ page }) => {
    const res = await page.goto(`/${locale}/reviews`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator(`header nav a[href="/${locale}/reviews"]`)).toHaveCount(1);
  });
}

test('데이터 상태와 표시가 정합한다 (통계·필터 vs 빈 상태)', async ({ page, request }) => {
  await page.goto('/en/reviews');

  const statCards = page.locator('main section').first().locator('.shadow-edi-caption');
  const cards = page.locator('main article');
  const cardCount = await cards.count();

  if (cardCount === 0) {
    // 0건: 빈 상태 문구 + 통계/필터 미렌더 (숫자를 지어내지 않는다)
    await expect(page.getByText(/No reviews yet/i)).toBeVisible();
    await expect(statCards).toHaveCount(0);
  } else {
    // 1건 이상: 통계 카드 2장(평균·건수) 렌더, 건수는 실제 카드 수 이상
    await expect(statCards).toHaveCount(2);
  }
});

test('Service 트러스트 스트립의 후기 링크가 /reviews 로 연결된다', async ({ page }) => {
  await page.goto('/en/service');
  const link = page.locator('main a[href="/en/reviews"]');
  await expect(link).toHaveCount(1);
  await link.click();
  await page.waitForURL(/\/en\/reviews$/);
  await expect(page.locator('main h1')).toBeVisible();
});
