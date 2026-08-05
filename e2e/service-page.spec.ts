import { expect, test } from '@playwright/test';

/**
 * SERVICE 페이지 (시퀀스 5a) 스모크.
 *
 * 고정하는 것: ① 5로케일 전부 200 + h1 렌더 ② nav SERVICE 탭이 링크로 활성
 * ③ 렌탈 크로스링크는 /studios 라우트가 살아있는 로케일(ko)에만 링크 — 그 외 비링크
 * (죽은 링크 0 — nav 게이트와 동일한 데이터 판정을 페이지도 따르는지)
 * ④ FAQ 전체 링크 → /faq (결정 ②-A: 기존 페이지 존치·위임)
 *
 * 전제: seed:packages (1hour·1pro = ko 전용).
 */

const LOCALES = ['ko', 'en', 'ja', 'zh-HK', 'zh-CN'] as const;

for (const locale of LOCALES) {
  test(`/service 렌더 + nav 활성 + 렌탈 게이트 — ${locale}`, async ({ page, request }) => {
    const res = await page.goto(`/${locale}/service`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();

    // nav SERVICE 탭이 비활성 span 이 아니라 링크다.
    await expect(page.locator(`header nav a[href="/${locale}/service"]`)).toHaveCount(1);

    // 렌탈 크로스링크: 실제 라우트 응답(200/404)과 링크 존재가 일치해야 한다.
    const rentalOk = (await request.get(`/${locale}/studios`)).status() === 200;
    const rentalLink = page.locator(`main a[href="/${locale}/studios"]`);
    await expect(rentalLink).toHaveCount(rentalOk ? 1 : 0);

    // FAQ 위임 링크(결정 ②-A).
    await expect(page.locator(`main a[href="/${locale}/faq"]`)).toHaveCount(1);
  });
}
