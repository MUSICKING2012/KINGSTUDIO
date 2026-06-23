import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookingUnavailableError, confirmBooking } from '../confirmBooking';
import type { ConfirmBookingInput } from '../confirmBooking';
import { SlotLockError } from '../../redis/slotLock';

const { mockGetAvailability, mockWithSlotLock, mockBookingCreate, mockPackageFindUniqueOrThrow } =
  vi.hoisted(() => ({
    mockGetAvailability: vi.fn(),
    mockWithSlotLock: vi.fn(),
    mockBookingCreate: vi.fn(),
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
};

beforeEach(() => {
  vi.resetAllMocks();
  // Default: lock acquired → execute callback
  mockWithSlotLock.mockImplementation((_roomId: string, _date: string, fn: () => Promise<unknown>) => fn());
  mockPackageFindUniqueOrThrow.mockResolvedValue({ name: 'Gold' });
  mockGetAvailability.mockResolvedValue(GOLD_SLOTS);
  mockBookingCreate.mockResolvedValue({ id: 'booking-abc' });
});

describe('confirmBooking', () => {
  it('정상 흐름 — 슬롯 있음 → Booking 생성 → bookingId/startTime/endTime 반환', async () => {
    const result = await confirmBooking(BASE_INPUT);

    expect(result).toEqual({
      bookingId: 'booking-abc',
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
});
