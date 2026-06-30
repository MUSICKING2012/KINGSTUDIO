/**
 * S3.4a — DB exclusion 에러 표면 계약 (§5.3 ② 안전망).
 * confirmBooking의 23P01 변환기가 매칭하는 리터럴을 grounding한다. Prisma는
 * bookings_no_overlap 위반을 PrismaClientUnknownRequestError로 싸고 .code가 없어
 * '23P01'·제약명이 message에만 있다(2026-06-30 probe 실측). Prisma 업그레이드로
 * 표면이 바뀌면 이 테스트가 먼저 깨진다.
 *
 * Real DB. confirmBooking을 우회한다(getAvailability+Redis 락이 두 번째 시도를
 * create 전에 막으므로). 직접 insert로 raw 제약 위반을 강제한다.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { toDbDate, toTimeDate } from '@/lib/slots/time';

const DATE = '2026-07-25';
const START = '10:00:00';
const END = '12:00:00';

let roomId: string;
let packageId: string;

async function cleanup() {
  if (roomId) await prisma.booking.deleteMany({ where: { date: toDbDate(DATE), roomId } });
}

beforeAll(async () => {
  const room = await prisma.room.findFirstOrThrow({ where: { name: 'Room A' } });
  const pkg = await prisma.package.findFirstOrThrow({ where: { name: 'Gold' } });
  roomId = room.id;
  packageId = pkg.id;
  await cleanup();
});

afterAll(cleanup);

describe('S3.4a exclusion 에러 표면 (bookings_no_overlap / 23P01)', () => {
  it('동일 슬롯 두 번째 confirmed → 23P01, message에 코드+제약명, 클래스 일치', async () => {
    const data = {
      roomId,
      date: toDbDate(DATE),
      startTime: toTimeDate(START),
      endTime: toTimeDate(END),
      packageId,
      headcount: 1,
      customerEmail: 'exclusion-surface@kingstudio.test',
      unitPriceKrw: 400_000,
      priceTotalKrw: 400_000,
      pricingSnapshot: {},
      packageSnapshot: {},
      refundPolicySnapshot: {},
      status: 'confirmed' as const,
    };

    await prisma.booking.create({ data, select: { id: true } });

    const caught = await prisma.booking
      .create({ data, select: { id: true } })
      .then(() => null)
      .catch((e) => e);

    expect(caught).not.toBeNull();
    expect(caught?.constructor?.name).toBe('PrismaClientUnknownRequestError');
    expect(String(caught?.message)).toContain('23P01');
    expect(String(caught?.message)).toContain('bookings_no_overlap');
  });
});
