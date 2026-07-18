/**
 * S2.6 — §4 Danger-Zone Gate: double-booking concurrency test.
 *
 * Two concurrent confirmBooking() calls targeting the same room/date/slot →
 * exactly ONE succeeds, the other is rejected by the Redis lock (SlotLockError)
 * or the DB exclusion constraint (Prisma P2010/unique-violation).
 * Real DB + real Redis — no mocks.
 *
 * HUMAN VERIFICATION REQUIRED before merge (§4 위험 구역).
 */

import { prisma } from '@/lib/db/prisma';
import { SlotLockError } from '@/lib/redis/slotLock';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BookingUnavailableError, confirmBooking } from '../confirmBooking';
import type { ConfirmBookingInput } from '../confirmBooking';
import { toKstDateString, toTimeDate } from '../time';

// ── Fixtures ───────────────────────────────────────────────────────────────
// Stage D: confirmBooking() now writes REAL Consent rows (append-only: `consents_no_delete` is a
// row-level BEFORE DELETE trigger; Consent→Booking FK is onDelete:Restrict — CLAUDE.md §3.1), so a
// scoped `deleteMany` can no longer remove a confirmed booking. Teardown is done in afterAll via
// TRUNCATE ... CASCADE: row-level DELETE triggers do NOT fire on TRUNCATE, so the append-only guard is
// bypassed for test cleanup only (the app's append-only enforcement is untouched). Leaving no rows
// behind is what keeps unrelated suites' blanket deleteMany (e.g. catalog.test.ts) green. The date is
// also randomised far out so a mid-run crash that skips teardown can't collide with the next run.
const TEST_DATE = toKstDateString(
  new Date(Date.now() + (60 + Math.floor(Math.random() * 3000)) * 86_400_000),
);
const TEST_DATE_D = new Date(TEST_DATE); // Prisma @db.Date where 절용 Date 객체
// 3 distinct Gold slots (10/12/14 → 10:00/12:00/14:00) — one per `it`, so the tests below never
// contend with EACH OTHER's (now permanent) rows within a single run either.
const SLOT_SINGLE = '10:00:00';
const SLOT_CONCURRENT = '12:00:00';
const SLOT_SEQUENTIAL = '14:00:00';

// IDs resolved dynamically so the test runs on any DB instance (no hardcoded CUIDs).
let TEST_ROOM_ID: string;
let TEST_PACKAGE_ID: string;

beforeAll(async () => {
  const room = await prisma.room.findFirstOrThrow({
    where: { name: 'Room A' },
  });
  const pkg = await prisma.package.findFirstOrThrow({
    where: { name: 'Gold' },
  });
  TEST_ROOM_ID = room.id;
  TEST_PACKAGE_ID = pkg.id;
});

// ── Teardown — clears this suite's rows (incl. append-only consents) via TRUNCATE (see note above).
afterAll(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "consents", "booking_participants", "payments", "bookings" CASCADE',
  );
});

function baseInput(startTime: string): ConfirmBookingInput {
  return {
    roomId: TEST_ROOM_ID,
    date: TEST_DATE,
    startTime,
    packageId: TEST_PACKAGE_ID,
    category: 'experience',
    headcount: 1,
    customerEmail: 's2.6-test@kingstudio.test',
    unitPriceKrw: 400_000,
    priceTotalKrw: 400_000,
    pricingSnapshot: {
      basis: 'per_person',
      unitPrice: 400_000,
      headcount: 1,
      multiplier: 1,
    },
    packageSnapshot: { name: 'Gold', category: 'experience', slotMinutes: 120 },
    refundPolicySnapshot: { policy: 'standard' },
    // adult participant (no guardian branch) — Stage D confirmBooking now re-validates
    // consent/minor status server-side before the slot lock; this test only exercises the
    // lock/23P01 concurrency path, so it supplies the minimum valid consent set.
    participants: [{ dateOfBirth: '1990-01-01' }],
    checkedConsents: ['tos', 'privacy', 'usage_scope', 'payment'],
    consentEvidence: { ip: null, userAgent: null, language: 'ko' },
    payment: { pg: 'inicis', amountKrw: 400_000, pgTransactionId: null },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────
describe('S2.6 concurrency — real DB + real Redis', () => {
  it('단일 confirmBooking → Booking 1개 생성', async () => {
    const result = await confirmBooking(baseInput(SLOT_SINGLE));

    expect(result.bookingId).toBeTruthy();
    expect(result.startTime).toBe(SLOT_SINGLE);
    expect(result.endTime).toBe('12:00:00');

    const rows = await prisma.booking.findMany({
      where: {
        date: TEST_DATE_D,
        roomId: TEST_ROOM_ID,
        startTime: toTimeDate(SLOT_SINGLE),
      },
    });
    expect(rows).toHaveLength(1);
  });

  it('concurrent confirmBooking calls: exactly one succeeds', async () => {
    const [r1, r2] = await Promise.allSettled([
      confirmBooking(baseInput(SLOT_CONCURRENT)),
      confirmBooking(baseInput(SLOT_CONCURRENT)),
    ]);

    const succeeded = [r1, r2].filter((r) => r.status === 'fulfilled');
    const failed = [r1, r2].filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    // 실패는 SlotLockError 또는 DB exclusion violation
    const err = (failed[0] as PromiseRejectedResult).reason;
    expect(
      err instanceof SlotLockError ||
        err.code === 'P2010' ||
        err.message?.includes('bookings_no_overlap'),
    ).toBe(true);

    // DB에 행이 정확히 1개
    const count = await prisma.booking.count({
      where: {
        date: TEST_DATE_D,
        roomId: TEST_ROOM_ID,
        startTime: toTimeDate(SLOT_CONCURRENT),
      },
    });
    expect(count).toBe(1);
  });

  it('sequential confirmBooking: second call rejected as unavailable', async () => {
    await confirmBooking(baseInput(SLOT_SEQUENTIAL));
    await expect(confirmBooking(baseInput(SLOT_SEQUENTIAL))).rejects.toThrow(
      BookingUnavailableError,
    );

    const count = await prisma.booking.count({
      where: {
        date: TEST_DATE_D,
        roomId: TEST_ROOM_ID,
        startTime: toTimeDate(SLOT_SEQUENTIAL),
      },
    });
    expect(count).toBe(1);
  });
});
