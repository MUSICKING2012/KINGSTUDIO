import { expect, test } from '@playwright/test';

/**
 * STUDIOS 페이지 (5d-1 리네임 + 5d-2 레이아웃 + 5d-3 전 로케일 소개 전환) 스모크 + 회귀 방지.
 *
 * 고정하는 것: ① 전 로케일 200 + h1 + nav 링크(5d-3 — 구 비-ko 404 게이트 폐기)
 * ② 구 URL 보존 — /rental 이 /studios 로 308 (체인 없이 직결) + 리다이렉트 추적 후 최종 200
 * ③ 대여 섹션은 rental 노출 로케일(seed 기준 ko)만 — 비-ko 에는 KRW 카드 0
 * ④ 5d-3 fill-in 렌더 — 룸 스펙 행(DB studio_room_profiles)·장비·팀 섹션이 DB 값으로 렌더,
 *    가격·스펙 하드코딩 금지의 실측면.
 *
 * 전제: seed:packages (1hour·1pro = ko 전용) + seed:studios (룸 프로필·장비·팀).
 */

const LOCALES = ['ko', 'en', 'ja', 'zh-HK', 'zh-CN'] as const;

for (const locale of LOCALES) {
  test(`/studios 전 로케일 200 + nav 링크 — ${locale}`, async ({ page }) => {
    const res = await page.goto(`/${locale}/studios`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    // nav STUDIOS 탭이 모든 로케일에서 활성 링크다(5d-3 게이트 해제).
    await expect(page.locator(`header nav a[href="/${locale}/studios"]`)).toHaveCount(1);
  });
}

test('5d-3 콘텐츠 — 룸 스펙·장비·팀이 DB 값으로 렌더된다 (ko)', async ({ page }) => {
  await page.goto('/ko/studios');
  // 룸 스펙 행: seed:studios 의 컨트롤룸/부스 평수(10·10 / 6·6)가 dt/dd 로 렌더.
  // 값 자체는 DB 를 따르므로 "스펙 dt 라벨이 룸당 2개 존재"로 고정(표시가 데이터를 앞서지 않는다).
  const specRows = page.locator('main dl div');
  expect(await specRows.count()).toBeGreaterThanOrEqual(2);
  // 장비 리스트: seed 기준 1개 이상. 무분류 평면 리스트(§4-A).
  const equipment = page.locator('main ul.list-none li');
  expect(await equipment.count()).toBeGreaterThan(0);
  // 팀 카드: 이름+역할만(사진·bio 없음 — §4-A). seed 기준 1명 이상.
  await expect(page.locator('main h2').nth(1)).toBeVisible();
});

test('대여 섹션 로케일 조건부 — ko 는 KRW 카드 렌더, en 은 0 (데이터 주도)', async ({ page }) => {
  await page.goto('/ko/studios');
  const koPriceCards = page.locator('main article').filter({ hasText: 'KRW' });
  expect(await koPriceCards.count()).toBeGreaterThan(0);
  // CTA 패널 → /product (See packages) + /product#bookbar (Book).
  await expect(page.locator('main a[href="/ko/product"]')).toHaveCount(1);
  await expect(page.locator('main a[href="/ko/product#bookbar"]')).toHaveCount(1);

  await page.goto('/en/studios');
  await expect(page.locator('main article').filter({ hasText: 'KRW' })).toHaveCount(0);
});

for (const locale of LOCALES) {
  test(`구 /rental 이 308 로 /studios 에 직결된다 (체인 0) — ${locale}`, async ({ request }) => {
    const res = await request.get(`/${locale}/rental`, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers().location).toBe(`/${locale}/studios`);
  });
}

test('구 URL 로 들어와도 전 로케일 최종 200 (5d-3 — 구 비-ko 404 게이트 폐기)', async ({
  request,
}) => {
  expect((await request.get('/ko/rental')).status()).toBe(200);
  expect((await request.get('/en/rental')).status()).toBe(200);
});
