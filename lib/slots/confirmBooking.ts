import { withSlotLock } from '@/lib/redis/slotLock';
import { Prisma } from '@prisma/client';
import type { Pg, DisplayCurrency } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getAvailability } from './availability';
import type { PackageTier } from './constants';
import { assertDateString, toDbDate, toTimeDate } from './time';

export class BookingUnavailableError extends Error {
  constructor(roomId: string, date: string, packageId: string) {
    super(`slot unavailable: room=${roomId} date=${date} package=${packageId}`);
    this.name = 'BookingUnavailableError';
  }
}

/// DB exclusion(bookings_no_overlap, Postgres 23P01)이 동시 트랜잭션의 선커밋으로 슬롯을 빼앗겨
/// create를 거부할 때(Redis 락이 직렬화 못 한 희귀 TOCTOU, §5.3 ② 최종 안전망). 이 에러와
/// BookingUnavailableError 둘 다 concurrent_booking_lost 환불 트리거(§5.3-D)이며, 환불은 호출부
/// (S3.4b)가 결정한다. NOTE: Prisma가 exclusion 위반을 PrismaClientUnknownRequestError로 싸고
/// .code가 없어 message의 '23P01' 리터럴로 매칭(2026-06-30 probe 실측). 현재 exclusion 제약은
/// 하나뿐이라 23P01=이 슬롯겹침; 제약이 늘면 제약명으로 좁힐 것.
export class SlotConflictError extends Error {
  readonly roomId: string;
  readonly date: string;
  readonly packageId: string;
  constructor(roomId: string, date: string, packageId: string) {
    super(`slot conflict (exclusion 23P01): room=${roomId} date=${date} package=${packageId}`);
    this.name = 'SlotConflictError';
    this.roomId = roomId;
    this.date = date;
    this.packageId = packageId;
  }
}

export type ConfirmBookingInput = {
  roomId: string;
  date: string;           // "YYYY-MM-DD" KST 벽시계 (호출자가 보장)
  startTime: string;      // "HH:MM:00" KST — 사용자가 선택한 슬롯 (spec 누락, 필수 추가)
  packageId: string;
  headcount: number;
  customerEmail: string;  // NOT NULL in schema (spec 누락, 필수 추가)
  unitPriceKrw: number;   // NOT NULL in schema (spec 누락, 필수 추가)
  priceTotalKrw: number;
  pricingSnapshot: object;
  packageSnapshot: object;
  refundPolicySnapshot: object;
  // 결제 정보 (캡처 후 호출 — PG 콜백이 채움). amountKrw는 priceTotalKrw와 독립(할인 대비).
  // status='paid'·paidAt은 입력이 아니라 confirmBooking이 강제(캡처 후이므로 항상 paid).
  // displayCurrency/displayAmount/exchangeRate는 S3.4a 범위 밖(환율 배선 미도입) — 미포함, 스키마 기본 null.
  payment: {
    pg: Pg;
    amountKrw: number;
    pgFeeKrw?: number;                 // default 0
    pgTransactionId?: string | null;   // @@unique; null 허용
  };
};

export type ConfirmBookingResult = {
  bookingId: string;
  paymentId: string;
  startTime: string;  // "HH:MM:00"
  endTime: string;    // "HH:MM:00"
};

export async function confirmBooking(input: ConfirmBookingInput): Promise<ConfirmBookingResult> {
  assertDateString(input.date);
  const {
    roomId, date, startTime, packageId,
    headcount, customerEmail, unitPriceKrw, priceTotalKrw,
    pricingSnapshot, packageSnapshot, refundPolicySnapshot, payment,
  } = input;

  return withSlotLock(roomId, date, async () => {
    // Resolve packageTier from DB so slot matching is by (startTime + tier), not startTime alone.
    const pkg = await prisma.package.findUniqueOrThrow({ where: { id: packageId }, select: { name: true } });
    const packageTier = pkg.name as PackageTier;

    const available = await getAvailability(roomId, date);
    const slot = available.find(s => s.startTime === startTime && s.packageTier === packageTier);

    if (!slot) {
      throw new BookingUnavailableError(roomId, date, packageId);
    }

    // Booking(confirmed) + Payment(paid)를 단일 인터랙티브 트랜잭션으로 원자 기록(§5.5).
    // getAvailability는 트랜잭션 밖(위)에서 이미 수행 — 트랜잭션은 두 write만 감싼다(타임아웃 압박 회피).
    // 23P01 catch는 콜백 안: 변환된 SlotConflictError가 throw되면 트랜잭션 롤백 → Payment도 안 생김.
    // ⚠ confirmed 전환이 자동화 체인(§5.8-A②)을 발화시키나, 발화는 트랜잭션 커밋 성공 후(Stage 7)에서 트리거 — 트랜잭션 안에서 이벤트를 쏘면 롤백돼도 이벤트가 나가므로 여기 두지 않는다.
    let result: { bookingId: string; paymentId: string };
    try {
      result = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.create({
          data: {
            roomId,
            date: toDbDate(date),              // @db.Date carrier
            startTime: toTimeDate(slot.startTime),
            endTime:   toTimeDate(slot.endTime),
            packageId,
            headcount,
            customerEmail,
            unitPriceKrw,
            priceTotalKrw,
            pricingSnapshot,
            packageSnapshot,
            refundPolicySnapshot,
            status: 'confirmed',
          },
          select: { id: true },
        });

        const pmt = await tx.payment.create({
          data: {
            bookingId: booking.id,
            pg: payment.pg,
            amountKrw: payment.amountKrw,
            pgFeeKrw: payment.pgFeeKrw ?? 0,
            pgTransactionId: payment.pgTransactionId ?? null,
            status: 'paid',
            paidAt: new Date(),
          },
          select: { id: true },
        });

        return { bookingId: booking.id, paymentId: pmt.id };
      });
    } catch (e) {
      // DB exclusion(bookings_no_overlap, 23P01): Redis 락이 직렬화 못 한 동시 커밋에 슬롯을
      // 빼앗김 → 환불용 타입 에러로 표면화(§5.3-D). 트랜잭션 콜백 throw는 롤백 후 전파됨.
      // 그 외 에러는 원형 그대로 전파.
      if (e instanceof Prisma.PrismaClientUnknownRequestError && e.message.includes('23P01')) {
        throw new SlotConflictError(roomId, date, packageId);
      }
      throw e;
    }

    return {
      bookingId: result.bookingId,
      paymentId: result.paymentId,
      startTime: slot.startTime,
      endTime:   slot.endTime,
    };
  });
}
