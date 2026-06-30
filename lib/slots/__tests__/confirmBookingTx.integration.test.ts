/**
 * S3.4a-2 — 인터랙티브 트랜잭션 안의 23P01 표면 검증.
 * a-1 exclusionSurface는 단일 create였다. a-2는 confirmBooking이 booking+payment를
 * $transaction(async tx => ...)로 묶는다. 콜백 안 tx.booking.create가 23P01로 깨질 때
 * 트랜잭션 밖에서 잡은 에러가 여전히 PrismaClientUnknownRequestError + '23P01'인지 확인 —
 * a-1 매칭 재사용 전제의 grounding. 깨지면 confirmBooking catch가 빗나간다는 신호.
 *
 * Real DB. confirmBooking을 우회하고 $transaction을 직접 사용(슬롯 락/가용성 무관하게 raw 충돌만 본다).
 * pgTransactionId=null로 둬 23505(unique)와 23P01을 안 섞는다.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { toDbDate, toTimeDate } from '@/lib/slots/time';

const DATE = '2026-07-26';
const START = '10:00:00';
const END = '12:00:00';

let roomId: string;
let packageId: string;

async function cleanup() {
  if (!roomId) return;
  // payment가 booking을 FK 참조 → payment 먼저 삭제.
  await prisma.payment.deleteMany({ where: { booking: { date: toDbDate(DATE), roomId } } });
  await prisma.booking.deleteMany({ where: { date: toDbDate(DATE), roomId } });
}

beforeAll(async () => {
  const room = await prisma.room.findFirstOrThrow({ where: { name: 'Room A' } });
  const pkg = await prisma.package.findFirstOrThrow({ where: { name: 'Gold' } });
  roomId = room.id;
  packageId = pkg.id;
  await cleanup();
});

afterAll(cleanup);

describe('S3.4a-2 트랜잭션 내 23P01 표면', () => {
  it('$transaction 안 tx.booking.create 겹침 → 콜백 밖에서 23P01 표면 유지', async () => {
    const bookingData = {
      roomId,
      date: toDbDate(DATE),
      startTime: toTimeDate(START),
      endTime: toTimeDate(END),
      packageId,
      headcount: 1,
      customerEmail: 'tx-surface@kingstudio.test',
      unitPriceKrw: 400_000,
      priceTotalKrw: 400_000,
      pricingSnapshot: {},
      packageSnapshot: {},
      refundPolicySnapshot: {},
      status: 'confirmed' as const,
    };

    // 1st: 트랜잭션으로 booking+payment 생성(슬롯 점유)
    await prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({ data: bookingData, select: { id: true } });
      await tx.payment.create({
        data: { bookingId: b.id, pg: 'inicis', amountKrw: 400_000, status: 'paid', paidAt: new Date() },
        select: { id: true },
      });
    });

    // 2nd: 같은 슬롯 → 콜백 안 tx.booking.create가 23P01 → 트랜잭션 롤백 후 전파
    const caught = await prisma
      .$transaction(async (tx) => {
        await tx.booking.create({ data: bookingData, select: { id: true } });
      })
      .then(() => null)
      .catch((e) => e);

    expect(caught).not.toBeNull();
    expect(caught?.constructor?.name).toBe('PrismaClientUnknownRequestError');
    expect(String(caught?.message)).toContain('23P01');
  });
});
