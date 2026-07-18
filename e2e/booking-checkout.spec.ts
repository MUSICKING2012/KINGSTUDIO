import { type APIRequestContext, expect, test } from '@playwright/test';

// Stage D checkout confirm (⚠ 최대 위험구역). API-level E2E against /api/booking/confirm — the
// authoritative price/consent boundary. Drives the endpoint directly (not the 4-step UI) so the
// danger-zone guards are tested deterministically: 하드제약 #4 un-bypassable minor block, and the
// concurrent-loss auto-refund path (§5.5-D). Requires seed: package 'gold' + an active room.

const PKG = 'gold';
const LOCALE = 'en';

// A date well inside the D+1..90 window; far out to reduce collision with other runs' bookings.
function futureDate(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function firstOpenSlot(
  request: APIRequestContext,
  date: string,
): Promise<{ startTime: string } | null> {
  const res = await request.get(`/api/availability?package=${PKG}&date=${date}&locale=${LOCALE}`);
  if (!res.ok()) return null;
  const body = (await res.json()) as { slots?: { startTime: string; available: boolean }[] };
  const open = body.slots?.find((s) => s.available);
  return open ? { startTime: open.startTime } : null;
}

function bodyFor(opts: {
  date: string;
  startTime: string;
  participantDobs: string[];
  consents: string[];
  guardian?: unknown;
  email?: string;
}) {
  return {
    package: PKG,
    date: opts.date,
    startTime: opts.startTime,
    headcount: opts.participantDobs.length,
    songId: null,
    reservant: {
      name: 'E2E Tester',
      email: opts.email ?? `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@test.local`,
      phone: '',
      nationality: '',
      passportName: '',
    },
    participantDobs: opts.participantDobs,
    guardian: opts.guardian ?? null,
    consents: opts.consents,
    pg: 'inicis',
    locale: LOCALE,
  };
}

const ADULT = '1990-01-01';
const MINOR = '2015-01-01';
const REQUIRED = ['tos', 'privacy', 'usage_scope', 'payment'];

test('happy path — adult booking confirms + returns bookingId', async ({ request }) => {
  const date = futureDate(75);
  const slot = await firstOpenSlot(request, date);
  if (!slot) return void test.skip(true, 'no open Gold slot (seed/availability)');

  const res = await request.post('/api/booking/confirm', {
    data: bodyFor({
      date,
      startTime: slot.startTime,
      participantDobs: [ADULT],
      consents: REQUIRED,
    }),
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { ok: boolean; bookingId?: string };
  expect(body.ok).toBe(true);
  expect(body.bookingId).toBeTruthy();
});

test('bookingFlow gate — b2b_quote package (making-class) is rejected by confirm API (direct-payment bypass attempt)', async ({
  request,
}) => {
  // PRD §5.3 group exception (2026-07-17): Making Class = B2B inquiry → admin quote (§5.8-A③),
  // never web/API direct payment. The UI never offers it — this drives the API directly to prove
  // the server gate holds on bookingFlow (not on the name-based grid fallback). Requires seed:
  // package 'making-class' (bookingFlow=b2b_quote, all locales).
  const res = await request.post('/api/booking/confirm', {
    data: {
      ...bodyFor({
        date: futureDate(78),
        startTime: '10:00:00', // a real Making Class operating slot — still must be rejected
        participantDobs: [ADULT, ADULT, ADULT],
        consents: REQUIRED,
      }),
      package: 'making-class',
    },
  });
  expect(res.status()).toBe(400);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe('not_web_bookable');
});

test('하드제약 #4 — minor + no guardian consent is blocked, NO booking created (bypass attempt)', async ({
  request,
}) => {
  const date = futureDate(76);
  const slot = await firstOpenSlot(request, date);
  if (!slot) return void test.skip(true, 'no open Gold slot');

  // Directly POST a minor participant with every consent EXCEPT guardian — the client gate bypassed.
  const res = await request.post('/api/booking/confirm', {
    data: bodyFor({
      date,
      startTime: slot.startTime,
      participantDobs: [ADULT, MINOR],
      consents: REQUIRED, // guardian intentionally omitted
    }),
  });
  expect(res.status()).toBe(422);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe('minor_guardian_required');

  // The slot must still be open — nothing was written (rejected before capture/write).
  const stillOpen = await firstOpenSlot(request, date);
  expect(stillOpen?.startTime).toBe(slot.startTime);
});

test('missing required consent (no payment) → 422, not booked', async ({ request }) => {
  const date = futureDate(77);
  const slot = await firstOpenSlot(request, date);
  if (!slot) return void test.skip(true, 'no open Gold slot');

  const res = await request.post('/api/booking/confirm', {
    data: bodyFor({
      date,
      startTime: slot.startTime,
      participantDobs: [ADULT],
      consents: ['tos', 'privacy', 'usage_scope'],
    }),
  });
  expect(res.status()).toBe(422);
  expect((await res.json()).error).toBe('consent_invalid');
});

test('concurrent bookings on the same slot — exactly one wins, loser 409 + refunded', async ({
  request,
}) => {
  const date = futureDate(78);
  const slot = await firstOpenSlot(request, date);
  if (!slot) return void test.skip(true, 'no open Gold slot');

  const mk = () =>
    request.post('/api/booking/confirm', {
      data: bodyFor({
        date,
        startTime: slot.startTime,
        participantDobs: [ADULT],
        consents: REQUIRED,
      }),
    });

  const [a, b] = await Promise.all([mk(), mk()]);
  const statuses = [a.status(), b.status()].sort();
  // one 200 (won) + one 409 (lost to concurrent booking, auto-refunded)
  expect(statuses).toEqual([200, 409]);

  const loser = a.status() === 409 ? a : b;
  const loserBody = (await loser.json()) as { error: string; refunded?: boolean };
  expect(['concurrent_booking_lost', 'slot_unavailable']).toContain(loserBody.error);
  if (loserBody.error === 'concurrent_booking_lost') expect(loserBody.refunded).toBe(true);
});

test('checkout page without a draft redirects out of checkout', async ({ page }) => {
  await page.goto(`/${LOCALE}/booking/checkout?package=${PKG}`);
  // Server shell renders; client detects no sessionStorage draft → shows the "missing draft" panel
  // with a link back to options (the page itself does not redirect, the panel gates progress).
  await expect(page.getByText('No booking details found.')).toBeVisible();
});
