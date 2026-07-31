import { type APIRequestContext, expect, test } from '@playwright/test';

/**
 * ⚠ 위험 구역 인접 (CLAUDE.md §4) — 홈 예약바(슬라이스 4e, 결정 ① = C 실 슬롯 배선).
 *
 * 이 스펙이 지키는 것은 두 가지다:
 *  1. **슬롯 진실이 하나뿐인가** — 홈 예약바가 보여주는 시간이 `/api/availability` 응답과
 *     정확히 일치해야 한다. 디자인의 `isFull()` 가짜 해시나 `PKG.slots` 데모 배열이
 *     흘러들어오면 여기서 깨진다(§11-D).
 *  2. **홈 → schedule 인계가 끊기지 않는가** — 홈에서 고른 날짜·슬롯이 draft
 *     (`kingstudio.booking`)로 넘어가 `SlotPicker` 가 복원해야 한다. 두 화면이 draft 계약을
 *     복제하면 조용히 어긋나므로 실제로 이어지는지 확인한다(Home_Slice_Spec §14-①-4).
 *
 * 홈 예약바는 **읽기 전용**이다 — 이 스펙은 예약을 만들지 않고 슬롯 락도 잡지 않는다(§14-①-5).
 * 전제: seed:packages(gold/diamond/premium) + seed:rooms(활성 Room 1개).
 */

const LOCALE = 'en';

/** D+1..90 창 안쪽. 다른 런과 겹칠 확률을 줄이려 넉넉히 앞선 날짜를 쓴다. */
function futureDate(daysAhead: number): string {
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
}

async function apiSlots(
  request: APIRequestContext,
  pkg: string,
  date: string,
): Promise<{ startTime: string; endTime: string; available: boolean }[]> {
  const res = await request.get(`/api/availability?package=${pkg}&date=${date}&locale=${LOCALE}`);
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as {
    slots?: { startTime: string; endTime: string; available: boolean }[];
  };
  return body.slots ?? [];
}

const hhmm = (t: string) => t.slice(0, 5);

test('홈 예약바의 시간 옵션이 /api/availability 응답과 일치한다 (가짜 슬롯 이식 방지)', async ({
  page,
  request,
}) => {
  const date = futureDate(45);
  const expected = await apiSlots(request, 'gold', date);
  expect(expected.length).toBeGreaterThan(0);

  await page.goto(`/${LOCALE}`);
  const bar = page.locator('#bookbar');
  await expect(bar).toBeVisible();

  await bar.getByRole('combobox').first().selectOption('gold');
  await bar.locator('input[type="date"]').fill(date);

  const timeSelect = bar.getByRole('combobox').nth(1);
  await expect(timeSelect).toBeEnabled();

  // 옵션 라벨(placeholder 제외)이 API 그리드와 1:1 이어야 한다.
  const labels = (await timeSelect.locator('option').allTextContents())
    .slice(1)
    .map((s) => s.trim());
  expect(labels.length).toBe(expected.length);
  for (const [i, slot] of expected.entries()) {
    expect(labels[i]).toContain(`${hhmm(slot.startTime)}–${hhmm(slot.endTime)}`);
  }

  // 마감 슬롯은 선택 불가로 표기되고, 색이 아니라 텍스트로 상태를 전달한다(§3.9).
  for (const slot of expected.filter((s) => !s.available)) {
    const opt = timeSelect.locator(`option[value="${slot.startTime}"]`);
    await expect(opt).toBeDisabled();
    expect((await opt.textContent())?.trim()).toMatch(/FULL/i);
  }
});

test('홈에서 고른 날짜·슬롯이 draft 로 schedule 에 인계된다', async ({ page, request }) => {
  const date = futureDate(46);
  const slots = await apiSlots(request, 'diamond', date);
  const open = slots.find((s) => s.available);
  test.skip(!open, `no open diamond slot on ${date}`);

  await page.goto(`/${LOCALE}`);
  const bar = page.locator('#bookbar');
  await bar.getByRole('combobox').first().selectOption('diamond');
  await bar.locator('input[type="date"]').fill(date);

  const timeSelect = bar.getByRole('combobox').nth(1);
  await expect(timeSelect).toBeEnabled();
  await timeSelect.selectOption((open as { startTime: string }).startTime);

  await bar.getByRole('button').click();

  // 예약 플로우 2단계로 이동 — 홈은 진입만 시키고 확정하지 않는다.
  await page.waitForURL(/\/booking\/schedule\?package=diamond/);

  // draft 계약이 공유되는지: 키·필드가 SlotPicker 가 읽는 그대로여야 한다.
  const draft = await page.evaluate(() => {
    const raw = window.sessionStorage.getItem('kingstudio.booking');
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  });
  expect(draft).toEqual({
    package: 'diamond',
    date,
    startTime: (open as { startTime: string }).startTime,
    endTime: (open as { endTime: string }).endTime,
  });

  // SlotPicker 가 그 draft 로 날짜를 복원했는지(= 인계가 실제로 이어졌는지).
  await expect(page.locator('#booking-date')).toHaveValue(date);
});

test('슬롯을 고르지 않아도 패키지만 들고 schedule 로 진입한다', async ({ page }) => {
  await page.goto(`/${LOCALE}`);
  const bar = page.locator('#bookbar');
  await bar.getByRole('combobox').first().selectOption('premium');
  await bar.getByRole('button').click();
  await page.waitForURL(/\/booking\/schedule\?package=premium/);
});
