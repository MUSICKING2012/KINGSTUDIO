import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SlotLockError } from '../../redis/slotLock';
import {
  BookingUnavailableError,
  ConsentRequiredError,
  InvalidConsentInputError,
  MinorConsentRequiredError,
  SlotConflictError,
  confirmBooking,
} from '../confirmBooking';
import type { ConfirmBookingInput } from '../confirmBooking';

const {
  mockGetAvailability,
  mockWithSlotLock,
  mockBookingCreate,
  mockPaymentCreate,
  mockConsentCreate,
  mockParticipantCreate,
  mockTransaction,
  mockPackageFindUniqueOrThrow,
} = vi.hoisted(() => ({
  mockGetAvailability: vi.fn(),
  mockWithSlotLock: vi.fn(),
  mockBookingCreate: vi.fn(),
  mockPaymentCreate: vi.fn(),
  mockConsentCreate: vi.fn(),
  mockParticipantCreate: vi.fn(),
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
    consent: { create: mockConsentCreate },
    bookingParticipant: { create: mockParticipantCreate },
    $transaction: mockTransaction,
  },
}));

const GOLD_SLOTS = [
  { startTime: '10:00:00', endTime: '12:00:00', packageTier: 'Gold' },
  { startTime: '12:00:00', endTime: '14:00:00', packageTier: 'Gold' },
];

const ADULT = '1990-01-01';
const MINOR = '2015-01-01';
// Experience required consents at confirm = tos/privacy/usage_scope + payment (Step 4).
const REQUIRED: ConfirmBookingInput['checkedConsents'] = [
  'tos',
  'privacy',
  'usage_scope',
  'payment',
];

function baseInput(overrides: Partial<ConfirmBookingInput> = {}): ConfirmBookingInput {
  return {
    roomId: 'room-a',
    date: '2026-08-01',
    startTime: '10:00:00',
    packageId: 'pkg-gold',
    category: 'experience',
    headcount: 2,
    songId: null,
    customerEmail: 'test@example.com',
    customerName: 'Test',
    unitPriceKrw: 400_000,
    priceTotalKrw: 540_000, // 600000 subtotal − 60000 returning (example)
    returningDiscountKrw: 60_000,
    pricingSnapshot: { basis: 'per_person', discounts: {} },
    packageSnapshot: { name: 'Gold', category: 'experience', slotMinutes: 120 },
    refundPolicySnapshot: { policy: 'standard' },
    participants: [{ dateOfBirth: ADULT }, { dateOfBirth: ADULT }],
    checkedConsents: REQUIRED,
    guardian: null,
    consentEvidence: { ip: '1.2.3.4', userAgent: 'jest', language: 'en' },
    payment: { pg: 'inicis', amountKrw: 540_000, pgFeeKrw: 16_200, pgTransactionId: 'pg-txn-test' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockWithSlotLock.mockImplementation(
    (_roomId: string, _date: string, fn: () => Promise<unknown>) => fn(),
  );
  mockPackageFindUniqueOrThrow.mockResolvedValue({ name: 'Gold' });
  mockGetAvailability.mockResolvedValue(GOLD_SLOTS);
  mockBookingCreate.mockResolvedValue({ id: 'booking-abc' });
  mockConsentCreate.mockImplementation((args: { data: { consentType: string } }) =>
    Promise.resolve({ id: `consent-${args.data.consentType}` }),
  );
  mockParticipantCreate.mockResolvedValue({ id: 'participant-x' });
  mockPaymentCreate.mockResolvedValue({ id: 'payment-xyz' });
  mockTransaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      booking: { create: mockBookingCreate },
      payment: { create: mockPaymentCreate },
      consent: { create: mockConsentCreate },
      bookingParticipant: { create: mockParticipantCreate },
    }),
  );
});

describe('confirmBooking — happy path (adult, experience)', () => {
  it('creates Booking + N Consent + N Participant + Payment; persists returningDiscountKrw', async () => {
    const result = await confirmBooking(baseInput());

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
          status: 'confirmed',
          returningDiscountKrw: 60_000,
          priceTotalKrw: 540_000,
        }),
      }),
    );
    // One consent row per checked consent (append-only: create only).
    expect(mockConsentCreate).toHaveBeenCalledTimes(REQUIRED.length);
    for (const c of REQUIRED) {
      expect(mockConsentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ consentType: c, consented: true }),
        }),
      );
    }
    // One participant per headcount, both adult → isMinor false, no guardian link.
    expect(mockParticipantCreate).toHaveBeenCalledTimes(2);
    expect(mockParticipantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isMinor: false, guardianConsentId: null }),
      }),
    );
    expect(mockPaymentCreate).toHaveBeenCalledOnce();
  });
});

describe('confirmBooking — 하드제약 #4 un-bypassable guard', () => {
  it('minor + no guardian consent → MinorConsentRequiredError BEFORE any write', async () => {
    const input = baseInput({
      participants: [{ dateOfBirth: ADULT }, { dateOfBirth: MINOR }],
      checkedConsents: REQUIRED, // guardian NOT checked
      guardian: null,
    });
    await expect(confirmBooking(input)).rejects.toThrow(MinorConsentRequiredError);
    expect(mockWithSlotLock).not.toHaveBeenCalled();
    expect(mockBookingCreate).not.toHaveBeenCalled();
    expect(mockConsentCreate).not.toHaveBeenCalled();
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it('minor recomputed SERVER-side from DOB — a directly-called bypass cannot skip it', async () => {
    // Caller "claims" everyone is adult by omitting guardian, but a real minor DOB is present.
    const input = baseInput({
      headcount: 1,
      participants: [{ dateOfBirth: MINOR }],
      checkedConsents: REQUIRED,
    });
    await expect(confirmBooking(input)).rejects.toThrow(MinorConsentRequiredError);
    expect(mockBookingCreate).not.toHaveBeenCalled();
  });

  it('missing required consent (no payment) → ConsentRequiredError, no write', async () => {
    const input = baseInput({ checkedConsents: ['tos', 'privacy', 'usage_scope'] });
    await expect(confirmBooking(input)).rejects.toThrow(ConsentRequiredError);
    expect(mockBookingCreate).not.toHaveBeenCalled();
  });

  it('empty participant DOBs → InvalidConsentInputError, no write', async () => {
    const input = baseInput({ headcount: 0, participants: [] });
    await expect(confirmBooking(input)).rejects.toThrow(InvalidConsentInputError);
    expect(mockBookingCreate).not.toHaveBeenCalled();
  });
});

describe('confirmBooking — minor with valid guardian consent', () => {
  it('writes guardian consent row + links minor participant.guardianConsentId', async () => {
    const input = baseInput({
      headcount: 2,
      participants: [{ dateOfBirth: ADULT }, { dateOfBirth: MINOR }],
      checkedConsents: [...REQUIRED, 'guardian'],
      guardian: { name: 'P', relation: 'mother', contact: '010', email: 'p@e.com' },
    });
    await confirmBooking(input);

    // guardian consent written with extraData.
    expect(mockConsentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          consentType: 'guardian',
          extraData: expect.objectContaining({ name: 'P', email: 'p@e.com' }),
        }),
      }),
    );
    // adult participant → no link; minor participant → linked to guardian consent id.
    expect(mockParticipantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isMinor: false, guardianConsentId: null }),
      }),
    );
    expect(mockParticipantCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isMinor: true, guardianConsentId: 'consent-guardian' }),
      }),
    );
  });
});

describe('confirmBooking — slot/lock/exclusion (unchanged contract)', () => {
  it('슬롯 없음 → BookingUnavailableError, prisma.create 미호출', async () => {
    mockGetAvailability.mockResolvedValue([]);
    await expect(confirmBooking(baseInput())).rejects.toThrow(BookingUnavailableError);
    expect(mockBookingCreate).not.toHaveBeenCalled();
  });

  it('SlotLockError → 그대로 전파', async () => {
    mockWithSlotLock.mockRejectedValue(new SlotLockError('room-a', '2026-08-01'));
    await expect(confirmBooking(baseInput())).rejects.toThrow(SlotLockError);
    expect(mockBookingCreate).not.toHaveBeenCalled();
  });

  it('23P01 exclusion 위반 → SlotConflictError 변환', async () => {
    const exclusionErr = new Prisma.PrismaClientUnknownRequestError(
      'Error occurred during query execution: PostgresError { code: "23P01", message: "conflicting key value violates exclusion constraint \\"bookings_no_overlap\\"" }',
      { clientVersion: 'test' },
    );
    mockBookingCreate.mockRejectedValue(exclusionErr);

    const caught = await confirmBooking(baseInput()).catch((e) => e);
    expect(caught).toBeInstanceOf(SlotConflictError);
    expect(caught).not.toBeInstanceOf(Prisma.PrismaClientUnknownRequestError);
  });

  it('prisma.create throw → 전파 (락 해제 보장)', async () => {
    mockBookingCreate.mockRejectedValue(new Error('DB write failed'));
    await expect(confirmBooking(baseInput())).rejects.toThrow('DB write failed');
  });
});
