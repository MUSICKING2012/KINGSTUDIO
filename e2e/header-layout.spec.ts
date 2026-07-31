import { expect, test } from '@playwright/test';

/**
 * 헤더 레이아웃 회귀 방지.
 *
 * 2026-07-31 실측 결함: 375px 뷰포트에서 우측 컨트롤 그룹(`flex-none`)이 371px 를 요구해
 * 가용폭 327px(= 375 − px-gutter 48)를 넘겼고, 축소되지 않아 **Book now 버튼이 화면 밖으로
 * 밀려났다**(right 395 > 375). 헤더는 `app/[locale]/layout.tsx` 에 마운트돼 있어 사이트 전
 * 페이지·전 로케일에 영향했다.
 *
 * 로케일마다 셀렉터 라벨 길이가 달라(`繁體中文（香港・台灣）` 가 최장) 폭 요구가 달라지므로
 * 5로케일 전부 확인한다.
 *
 * ⚠ 문서 가로 스크롤(`scrollWidth > clientWidth`)로는 판정하지 않는다 — 중앙 nav 가 디자인상
 * `overflow-x:auto`(햄버거 없음, Nav_Footer_Slice_Spec §1-C)라 내부 스크롤 폭이 항상 잡힌다.
 * 판정 기준은 "헤더의 어떤 요소도 뷰포트 밖으로 나가지 않는다"이다.
 */

const LOCALES = ['ko', 'en', 'ja', 'zh-HK', 'zh-CN'] as const;

for (const locale of LOCALES) {
  test(`헤더가 375px 에서 뷰포트를 넘지 않는다 — ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/${locale}`);
    await expect(page.locator('header')).toBeVisible();

    const offenders = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      return [...document.querySelectorAll('header *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0) return false;
          if (!(r.right > vw + 0.5 || r.left < -0.5)) return false;
          // overflow 컨테이너 안에서 잘리는 요소는 화면 밖으로 새지 않는다(중앙 nav 내부 등).
          let n = el.parentElement;
          while (n) {
            if (getComputedStyle(n).overflowX !== 'visible') return false;
            n = n.parentElement;
          }
          return true;
        })
        .map((el) => `${el.tagName}.${el.className.toString().slice(0, 60)}`);
    });
    expect(offenders).toEqual([]);

    // Book now 는 헤더의 주요 CTA — 항상 화면 안에 온전히 있어야 한다.
    const box = await page.locator('header a[href$="/booking"]').boundingBox();
    expect(box).not.toBeNull();
    const vw = page.viewportSize()?.width ?? 375;
    expect((box as { x: number; width: number }).x).toBeGreaterThanOrEqual(0);
    expect(
      (box as { x: number; width: number }).x + (box as { x: number; width: number }).width,
    ).toBeLessThanOrEqual(vw + 0.5);
  });
}
