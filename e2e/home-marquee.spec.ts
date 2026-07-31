import { expect, test } from '@playwright/test';

/**
 * 마퀴 화면 밖 일시정지 회귀 방지 (Gate 3 성능).
 *
 * 2026-07-31 Lighthouse 실측(프로덕션 /en 데스크톱): `edi-marquee 24s infinite` 가 CPU 유휴를
 * 영원히 막아 트레이스가 14.7s 까지 늘어나고 Speed Index 8.7s · LCP 2.5s → 성능 77(≥90 미달).
 * 마퀴만 멈추면 98. 수정 = 뷰포트 밖에서 `animation-play-state: paused`(`Marquee` 래퍼).
 *
 * 이 스펙은 양방향을 고정한다: 첫 화면(마퀴는 폴드 아래)에서 paused, 스크롤로 보이면 running,
 * 다시 나가면 paused. 시각 디자인(보이는 동안 흐르는 마퀴)은 그대로임을 running 확인이 보증한다.
 */

test('마퀴는 화면 밖에서 멈추고 보이면 돈다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/en');

  const marquee = page.locator('.animate-edi-marquee');
  await expect(marquee).toHaveCount(1);

  // 첫 화면: 마퀴는 폴드 아래 → 하이드레이션 후 paused 로 수렴해야 한다.
  await expect
    .poll(async () => marquee.evaluate((el) => (el as HTMLElement).style.animationPlayState), {
      timeout: 10_000,
    })
    .toBe('paused');

  // 보이게 스크롤 → running (시각 유지 보증).
  await marquee.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => marquee.evaluate((el) => (el as HTMLElement).style.animationPlayState))
    .toBe('running');

  // 다시 화면 밖 → paused.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(async () => marquee.evaluate((el) => (el as HTMLElement).style.animationPlayState))
    .toBe('paused');
});
