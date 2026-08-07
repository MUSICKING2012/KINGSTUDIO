import { expect, test } from '@playwright/test';

/**
 * BLOG 페이지 (시퀀스 5e-1) 스모크 + 회귀 방지. 스펙 = `Blog_Slice_Spec.md` §2·§3.
 *
 * 고정하는 것: ① /blog 전 로케일 200 + h1 (글 유무와 무관 — 빈 상태도 200)
 * ② nav BLOG 탭은 5e-2(Ghost 이관) 전까지 **비활성 span** — 링크가 생기면 회귀
 * ③ 상세: 발행 글(seed:blog 기준 ≥1)은 200 + h1 + BlogPosting JSON-LD, 미존재 slug 404
 * ④ en 단일 본문(결정 ⓒ) — ko 로케일에서도 글 제목은 en 그대로
 *
 * 전제: seed:blog (content/blog/*.md ≥ 1건 — nyt-feature-2024).
 */

const LOCALES = ['ko', 'en', 'ja', 'zh-HK', 'zh-CN'] as const;

for (const locale of LOCALES) {
  test(`/blog 전 로케일 200 + nav 탭 활성 — ${locale}`, async ({ page }) => {
    const res = await page.goto(`/${locale}/blog`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    // 5e-2: Ghost 이관 완료로 BLOG 탭 활성(§2-ⓐ 게이트 해제) — 링크가 사라지면 회귀.
    await expect(page.locator(`header nav a[href="/${locale}/blog"]`)).toHaveCount(1);
  });
}

test('상세 — 발행 글이 있으면 목록 카드 → 상세 200 + JSON-LD, en 본문 유지 (ko)', async ({
  page,
}) => {
  await page.goto('/ko/blog');
  // 데이터 주도: 목록의 첫 글 링크를 따라간다(특정 slug 하드코딩 금지 — 글 0건이면 이 단언은
  // 빈 상태 문구로 대체).
  const firstCard = page.locator('main a[href*="/blog/"]').first();
  if ((await firstCard.count()) === 0) {
    await expect(page.locator('main p').first()).toBeVisible(); // empty state
    return;
  }
  // click + toHaveURL(15s) 대신 goto(30s) — 병렬 부하에서 신규 동적 라우트의 dev cold-compile 이
  // 15s expect 창을 넘겨 플레이크가 됐다(2026-08-05 전체 스위트 2회 실측, 단독 8s 통과).
  const href = await firstCard.getAttribute('href');
  expect(href).toMatch(/\/ko\/blog\/.+/);
  await page.goto(href as string);
  await expect(page.locator('main h1')).toBeVisible();
  // BlogPosting JSON-LD (감사 제외 정책: Review·AggregateRating·FAQPage·HowTo 미포함).
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(jsonLd).toContain('"BlogPosting"');
  expect(jsonLd).not.toContain('AggregateRating');
  expect(jsonLd).not.toContain('FAQPage');
});

test('미존재 slug 는 404', async ({ request }) => {
  expect((await request.get('/en/blog/this-slug-does-not-exist')).status()).toBe(404);
});

test('sitemap 이 /blog 목록 + 발행 글 URL 을 포함한다 (5e-2 편입)', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  expect(xml).toContain('/en/blog');
  // 글별 URL — seed:blog 전제(nyt-feature-2024 ≥ 1건). W4 계열: 등재 URL = published-only.
  expect(xml).toContain('/en/blog/nyt-feature-2024');
});
