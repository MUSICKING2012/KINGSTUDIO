import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookingUnavailableError, SlotConflictError, confirmBooking } from '../confirmBooking';
import type { ConfirmBookingInput } from '../confirmBooking';
import { SlotLockError } from '../../redis/slotLock';

const {
  mockGetAvailability, mockWithSlotLock, mockBookingCreate,
  mockPaymentCreate, mockTransaction, mockPackageFindUniqueOrThrow,
} =
  vi.hoisted(() => ({
    mockGetAvailability: vi.fn(),
    mockWithSlotLock: vi.fn(),
    mockBookingCreate: vi.fn(),
    mockPaymentCreate: vi.fn(),
    mockTransaction: vi.fn(),
    mockPackageFindUniqueOrThrow: vi.fn(),
  }));

vi.mock('../availability', () => ({
  getAvailability: mockGetAvailability,
}));

// Spread real module so SlotLockError class identity is preserved for instanceof checks.
vi.mock('../../redis/slotLock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../redis/slotLock')>();
  return { ...actual, withSlotLock: mockWithSlotLock };
});

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    package: { findUniqueOrThrow: mockPackageFindUniqueOrThrow },
    booking: { create: mockBookingCreate },
    payment: { create: mockPaymentCreate },
    $transaction: mockTransaction,
  },
}));

const GOLD_SLOTS = [
  { startTime: '10:00:00', endTime: '12:00:00', packageTier: 'Gold' },
  { startTime: '12:00:00', endTime: '14:00:00', packageTier: 'Gold' },
];

const BASE_INPUT: ConfirmBookingInput = {
  roomId: 'room-a',
  date: '2026-07-01',
  startTime: '10:00:00',
  packageId: 'pkg-gold',
  headcount: 2,
  customerEmail: 'test@example.com',
  unitPriceKrw: 400_000,
  priceTotalKrw: 600_000,
  pricingSnapshot: { basis: 'per_person', unitPrice: 400_000, headcount: 2, multiplier: 1.5 },
  packageSnapshot: { name: 'Gold', category: 'experience', slotMinutes: 120 },
  refundPolicySnapshot: { policy: 'standard' },
  payment: { pg: 'inicis', amountKrw: 600_000, pgFeeKrw: 18_000, pgTransactionId: 'pg-txn-test' },
};

beforeEach(() => {
  vi.resetAllMocks();
  // Default: lock acquired → execute callback
  mockWithSlotLock.mockImplementation((_roomId: string, _date: string, fn: () => Promise<unknown>) => fn());
  mockPackageFindUniqueOrThrow.mockResolvedValue({ name: 'Gold' });
  mockGetAvailability.mockResolvedValue(GOLD_SLOTS);
  mockBookingCreate.mockResolvedValue({ id: 'booking-abc' });
  mockPaymentCreate.mockResolvedValue({ id: 'payment-xyz' });
  // 인터랙티브 트랜잭션 mock: 콜백에 가짜 tx(booking/payment create) 주입 후 실행.
  // tx.booking.create/tx.payment.create가 각 mock을 가리키므로 기존 booking 단언이 그대로 유효.
  mockTransaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn({ booking: { create: mockBookingCreate }, payment: { create: mockPaymentCreate } }),
  );
});

describe('confirmBooking', () => {
  it('정상 흐름 — 슬롯 있음 → Booking 생성 → bookingId/startTime/endTime 반환', async () => {
    const result = await confirmBooking(BASE_INPUT);

    expect(result).toEqual({
      bookingId: 'booking-abc',
      paymentId: 'payment-xyz',
      startTime: '10:00:00',
      endTime: '12:00:00',
    });
    expect(mockBookingCreate).toHaveBeenCalledOnce();
    expect(mockBookingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roomId: 'room-a',
          packageId: 'pkg-gold',
          headcount: 2,
          status: 'confirmed',
        }),
      }),
    );
  });

  it('슬롯 없음 → BookingUnavailableError throw, prisma.create 미호출', async () => {
    mockGetAvailability.mockResolvedValue([]);

    await expect(confirmBooking(BASE_INPUT)).rejects.toThrow(BookingUnavailableError);
    await expect(confirmBooking(BASE_INPUT)).rejects.toThrow(
      'slot unavailable: room=room-a date=2026-07-01 package=pkg-gold',
    );
    expect(mockBookingCreate).not.toHaveBeenCalled();
  });

  it('SlotLockError → catch 없이 그대로 전파', async () => {
    mockWithSlotLock.mockRejectedValue(new SlotLockError('room-a', '2026-07-01'));

    await expect(confirmBooking(BASE_INPUT)).rejects.toThrow(SlotLockError);
    expect(mockBookingCreate).not.toHaveBeenCalled();
  });

  it('prisma.create throw → 에러 전파 (withSlotLock finally가 락 해제 보장)', async () => {
    mockBookingCreate.mockRejectedValue(new Error('DB write failed'));

    await expect(confirmBooking(BASE_INPUT)).rejects.toThrow('DB write failed');
  });

  it('같은 roomId+date 두 번째 호출 → SlotLockError (withSlotLock mock으로 시뮬레이션)', async () => {
    mockWithSlotLock
      .mockImplementationOnce((_roomId: string, _date: string, fn: () => Promise<unknown>) => fn())
      .mockRejectedValueOnce(new SlotLockError('room-a', '2026-07-01'));

    await expect(confirmBooking(BASE_INPUT)).resolves.toBeDefined();
    await expect(confirmBooking(BASE_INPUT)).rejects.toThrow(SlotLockError);
  });

  it('23P01 exclusion 위반 → SlotConflictError 변환 (raw 에러 미전파)', async () => {
    // 합성 에러는 2026-06-30 probe 실측 표면을 모사: PrismaClientUnknownRequestError, .code 없음, '23P01'은 message에만.
    const exclusionErr = new Prisma.PrismaClientUnknownRequestError(
      'Error occurred during query execution: PostgresError { code: "23P01", message: "conflicting key value violates exclusion constraint \\"bookings_no_overlap\\"" }',
      { clientVersion: 'test' },
    );
    mockBookingCreate.mockRejectedValue(exclusionErr);

    const caught = await confirmBooking(BASE_INPUT).catch((e) => e);
    expect(caught).toBeInstanceOf(SlotConflictError);
    expect(caught).not.toBeInstanceOf(Prisma.PrismaClientUnknownRequestError);
  });
});
