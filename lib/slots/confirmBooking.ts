import { withSlotLock } from '@/lib/redis/slotLock';
import { prisma } from '@/lib/db/prisma';
import { getAvailability } from './availability';
import type { PackageTier } from './constants';
import { assertDateString } from './time';

export class BookingUnavailableError extends Error {
  constructor(roomId: string, date: string, packageId: string) {
    super(`slot unavailable: room=${roomId} date=${date} package=${packageId}`);
    this.name = 'BookingUnavailableError';
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
};

export type ConfirmBookingResult = {
  bookingId: string;
  startTime: string;  // "HH:MM:00"
  endTime: string;    // "HH:MM:00"
};

// Write-path adapter: converts "HH:MM:00" KST naive string to the Date carrier
// Prisma requires for @db.Time(0). Not epoch arithmetic for time derivation (PRD C19).
export function toTimeDate(t: string): Date {
  return new Date(`1970-01-01T${t}.000Z`);
}

export async function confirmBooking(input: ConfirmBookingInput): Promise<ConfirmBookingResult> {
  assertDateString(input.date);
  const {
    roomId, date, startTime, packageId,
    headcount, customerEmail, unitPriceKrw, priceTotalKrw,
    pricingSnapshot, packageSnapshot, refundPolicySnapshot,
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

    const booking = await prisma.booking.create({
      data: {
        roomId,
        date: new Date(date),              // @db.Date carrier
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

    return {
      bookingId: booking.id,
      startTime: slot.startTime,
      endTime:   slot.endTime,
    };
  });
}
