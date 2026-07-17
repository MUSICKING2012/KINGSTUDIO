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
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { BookingUnavailableError, confirmBooking } from '../confirmBooking';
import type { ConfirmBookingInput } from '../confirmBooking';

// ── Fixtures ───────────────────────────────────────────────────────────────
const TEST_DATE = '2026-07-23'; // KST+30d — no real-booking collision (ConfirmBookingInput용 string)
const TEST_DATE_D = new Date(TEST_DATE); // Prisma @db.Date where 절용 Date 객체
const TEST_START_TIME = '10:00:00'; // first Gold slot

// IDs resolved dynamically so the test runs on any DB instance (no hardcoded CUIDs).
let TEST_ROOM_ID: string;
let TEST_PACKAGE_ID: string;

beforeAll(async () => {
  const room = await prisma.room.findFirstOrThrow({ where: { name: 'Room A' } });
  const pkg = await prisma.package.findFirstOrThrow({ where: { name: 'Gold' } });
  TEST_ROOM_ID = room.id;
  TEST_PACKAGE_ID = pkg.id;
});

function baseInput(): ConfirmBookingInput {
  return {
    roomId: TEST_ROOM_ID,
    date: TEST_DATE,
    startTime: TEST_START_TIME,
    packageId: TEST_PACKAGE_ID,
    headcount: 1,
    customerEmail: 's2.6-test@kingstudio.test',
    unitPriceKrw: 400_000,
    priceTotalKrw: 400_000,
    pricingSnapshot: { basis: 'per_person', unitPrice: 400_000, headcount: 1, multiplier: 1 },
    packageSnapshot: { name: 'Gold', category: 'experience', slotMinutes: 120 },
    refundPolicySnapshot: { policy: 'standard' },
    payment: { pg: 'inicis', amountKrw: 400_000, pgTransactionId: null },
  };
}

// ── Cleanup — idempotent, runs after every test ───────────────────────────
afterEach(async () => {
  // payment가 booking을 FK 참조(payments_booking_id_fkey) → payment 먼저 삭제.
  await prisma.payment.deleteMany({
    where: { booking: { date: TEST_DATE_D, roomId: TEST_ROOM_ID } },
  });
  await prisma.booking.deleteMany({
    where: { date: TEST_DATE_D, roomId: TEST_ROOM_ID },
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────
describe('S2.6 concurrency — real DB + real Redis', () => {
  it('단일 confirmBooking → Booking 1개 생성', async () => {
    const result = await confirmBooking(baseInput());

    expect(result.bookingId).toBeTruthy();
    expect(result.startTime).toBe(TEST_START_TIME);
    expect(result.endTime).toBe('12:00:00');

    const rows = await prisma.booking.findMany({
      where: { date: TEST_DATE_D, roomId: TEST_ROOM_ID },
    });
    expect(rows).toHaveLength(1);
  });

  it('concurrent confirmBooking calls: exactly one succeeds', async () => {
    const [r1, r2] = await Promise.allSettled([
      confirmBooking(baseInput()),
      confirmBooking(baseInput()),
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
      where: { date: TEST_DATE_D, roomId: TEST_ROOM_ID },
    });
    expect(count).toBe(1);
  });

  it('sequential confirmBooking: second call rejected as unavailable', async () => {
    await confirmBooking(baseInput());
    await expect(confirmBooking(baseInput())).rejects.toThrow(BookingUnavailableError);

    const count = await prisma.booking.count({
      where: { date: TEST_DATE_D, roomId: TEST_ROOM_ID },
    });
    expect(count).toBe(1);
  });
});
