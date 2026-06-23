import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAvailability } from '../availability';
import type { AvailableSlot } from '../availability';
import type { PackageTier } from '../constants';
import { toKstTimeString } from '../time';

// vi.hoisted: vi.mock factory is hoisted before variable declarations
const { mockSettingFindUnique, mockBookingFindMany } = vi.hoisted(() => ({
  mockSettingFindUnique: vi.fn(),
  mockBookingFindMany: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    setting: { findUnique: mockSettingFindUnique },
    booking: { findMany: mockBookingFindMany },
  },
}));

// Builds the Date object that Prisma returns for @db.Time(0) columns:
// time-without-timezone is represented as 1970-01-01T{hh}:{mm}:00Z.
const pt = (h: number, m = 0) =>
  new Date(`1970-01-01T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`);

const stdHours = { key: 'operating_hours', value: { open: '10:00', close: '22:00' } };

// Checks whether the result contains a specific package+start slot.
const has = (slots: AvailableSlot[], pkg: PackageTier, h: number, m = 0) =>
  slots.some(s => s.packageTier === pkg && s.startTime === toKstTimeString(h, m));

beforeEach(() => {
  mockSettingFindUnique.mockReset();
  mockBookingFindMany.mockReset();
  mockSettingFindUnique.mockResolvedValue(stdHours);
  mockBookingFindMany.mockResolvedValue([]);
});

describe('getAvailability', () => {
  it('예약 없음 → 모든 후보 슬롯 23개 반환 (Gold 6 + Diamond 6 + Premium 3 + 1Hour 5 + 1Pro 3)', async () => {
    const slots = await getAvailability('room-A', '2026-07-01');
    expect(slots).toHaveLength(23);
  });

  it('booking [10:00, 12:00) 1건 → 10:00 시작 슬롯 5개 제외, 23 - 5 = 18 반환', async () => {
    mockBookingFindMany.mockResolvedValue([{ startTime: pt(10), endTime: pt(12) }]);
    const slots = await getAvailability('room-A', '2026-07-01');

    // Blocked: all packages starting at 10:00 overlap [10:00, 12:00)
    expect(has(slots, 'Gold', 10)).toBe(false);
    expect(has(slots, 'Diamond', 10)).toBe(false);
    expect(has(slots, 'Premium', 10)).toBe(false);   // [10:00, 13:00) ∩ [10:00, 12:00)
    expect(has(slots, '1Hour', 10)).toBe(false);     // [10:00, 11:00) ∩ [10:00, 12:00)
    expect(has(slots, '1Pro', 10)).toBe(false);      // [10:00, 13:30) ∩ [10:00, 12:00)

    // Not blocked: Gold 12:00 [12:00, 14:00) — booking ends where this slot starts
    expect(has(slots, 'Gold', 12)).toBe(true);

    expect(slots).toHaveLength(18);
  });

  it('half-open 경계: booking.endTime === slot.startTime → 인접 슬롯은 겹침 아님(허용)', async () => {
    mockBookingFindMany.mockResolvedValue([{ startTime: pt(10), endTime: pt(12) }]);
    const slots = await getAvailability('room-A', '2026-07-01');

    // [10:00, 12:00) ∩ [12:00, ?) : '12:00:00' < '12:00:00' = false → no overlap
    expect(has(slots, 'Gold', 12)).toBe(true);
    expect(has(slots, 'Diamond', 12)).toBe(true);
    expect(has(slots, '1Hour', 12)).toBe(true);
  });

  it('완전 포함 overlap: booking [12:00, 14:00)이 1Hour [12:00, 13:00) 포함 → 제외', async () => {
    mockBookingFindMany.mockResolvedValue([{ startTime: pt(12), endTime: pt(14) }]);
    const slots = await getAvailability('room-A', '2026-07-01');

    // Fully contained within booking → blocked
    expect(has(slots, '1Hour', 12)).toBe(false);   // [12:00, 13:00) ⊂ [12:00, 14:00)
    expect(has(slots, 'Gold', 12)).toBe(false);    // [12:00, 14:00) = booking exactly

    // Adjacent before booking: Gold [10:00, 12:00) ends where booking starts → not blocked
    expect(has(slots, 'Gold', 10)).toBe(true);
    // Adjacent after booking: Gold [14:00, 16:00) starts where booking ends → not blocked
    expect(has(slots, 'Gold', 14)).toBe(true);
  });

  it('operating_hours Setting 없을 때 fail-safe 10:00–22:00 적용 → 23슬롯 반환', async () => {
    mockSettingFindUnique.mockResolvedValue(null);
    const slots = await getAvailability('room-A', '2026-07-01');
    expect(slots).toHaveLength(23);
  });
});
