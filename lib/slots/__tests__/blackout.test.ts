import { prisma } from '@/lib/db/prisma';
import type { Blackout } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { isBlackedOut } from '../blackout';

// @db.Date → Prisma delivers UTC midnight
const dt = (s: string) => new Date(`${s}T00:00:00.000Z`);
// @db.Time(0) → Prisma delivers 1970-01-01 epoch + time as UTC
const tm = (h: number, m: number) => new Date(Date.UTC(1970, 0, 1, h, m, 0));

const ROOM = 'room-bk-test';
let seq = 0;
const bk = (ov: Partial<Blackout> = {}): Blackout =>
  ({
    id: `bk-${++seq}`,
    scope: 'slot',
    dateStart: dt('2026-07-10'),
    dateEnd: dt('2026-07-10'),
    timeStart: tm(10, 0),
    timeEnd: tm(12, 0),
    recurringRule: null,
    reason: 'internal_use',
    reasonNote: null,
    roomId: ROOM,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...ov,
  }) as Blackout;

// ── slot ──────────────────────────────────────────────────────────────────────
describe('isBlackedOut — slot', () => {
  it('overlapping slot → true', () => {
    expect(isBlackedOut(ROOM, '2026-07-10', '10:00:00', '12:00:00', [bk()])).toBe(true);
  });
  it('partial overlap (slot starts inside) → true', () => {
    expect(isBlackedOut(ROOM, '2026-07-10', '11:00:00', '13:00:00', [bk()])).toBe(true);
  });
  it('adjacent after (slot starts = blackout ends) → false [) boundary', () => {
    expect(isBlackedOut(ROOM, '2026-07-10', '12:00:00', '14:00:00', [bk()])).toBe(false);
  });
  it('adjacent before (slot ends = blackout starts) → false [) boundary', () => {
    expect(isBlackedOut(ROOM, '2026-07-10', '08:00:00', '10:00:00', [bk()])).toBe(false);
  });
  it('different date → false', () => {
    expect(isBlackedOut(ROOM, '2026-07-11', '10:00:00', '12:00:00', [bk()])).toBe(false);
  });
  it('different room → false', () => {
    expect(isBlackedOut('other-room', '2026-07-10', '10:00:00', '12:00:00', [bk()])).toBe(false);
  });
  it('empty blackouts → false', () => {
    expect(isBlackedOut(ROOM, '2026-07-10', '10:00:00', '12:00:00', [])).toBe(false);
  });
});

// ── full_day ──────────────────────────────────────────────────────────────────
describe('isBlackedOut — full_day', () => {
  const fd = (start: string, end: string, roomId: string | null = ROOM) =>
    bk({
      scope: 'full_day',
      dateStart: dt(start),
      dateEnd: dt(end),
      timeStart: null,
      timeEnd: null,
      roomId,
    });

  it('same day → true (any time)', () => {
    expect(
      isBlackedOut(ROOM, '2026-07-10', '14:00:00', '16:00:00', [fd('2026-07-10', '2026-07-10')]),
    ).toBe(true);
  });
  it('date within multi-day range → true', () => {
    expect(
      isBlackedOut(ROOM, '2026-07-12', '10:00:00', '12:00:00', [fd('2026-07-10', '2026-07-14')]),
    ).toBe(true);
  });
  it('start boundary (= dateStart) → true', () => {
    expect(
      isBlackedOut(ROOM, '2026-07-10', '10:00:00', '12:00:00', [fd('2026-07-10', '2026-07-14')]),
    ).toBe(true);
  });
  it('end boundary (= dateEnd) → true', () => {
    expect(
      isBlackedOut(ROOM, '2026-07-14', '10:00:00', '12:00:00', [fd('2026-07-10', '2026-07-14')]),
    ).toBe(true);
  });
  it('date before range → false', () => {
    expect(
      isBlackedOut(ROOM, '2026-07-09', '10:00:00', '12:00:00', [fd('2026-07-10', '2026-07-14')]),
    ).toBe(false);
  });
  it('date after range → false', () => {
    expect(
      isBlackedOut(ROOM, '2026-07-15', '10:00:00', '12:00:00', [fd('2026-07-10', '2026-07-14')]),
    ).toBe(false);
  });
  it('roomId null blocks any room (C20.6)', () => {
    expect(
      isBlackedOut('any-room', '2026-07-10', '10:00:00', '12:00:00', [
        fd('2026-07-10', '2026-07-10', null),
      ]),
    ).toBe(true);
  });
  it('specific room does not block different room', () => {
    expect(
      isBlackedOut('other-room', '2026-07-10', '10:00:00', '12:00:00', [
        fd('2026-07-10', '2026-07-10'),
      ]),
    ).toBe(false);
  });
});

// ── recurring ─────────────────────────────────────────────────────────────────
// 2026-07-05 = Sunday (0), 2026-07-06 = Monday (1), 2026-07-07 = Tuesday (2)
// 2026-07-01 = Wednesday (3), 2026-07-31 = Friday (5)
describe('isBlackedOut — recurring', () => {
  const rec = (ov: Partial<Blackout> = {}) =>
    bk({
      scope: 'recurring',
      dateStart: dt('2026-07-01'),
      dateEnd: dt('2026-07-31'),
      timeStart: tm(10, 0),
      timeEnd: tm(12, 0),
      recurringRule: 'FREQ=WEEKLY;BYDAY=SU,MO',
      ...ov,
    });

  it('matching day + overlapping time → true', () => {
    expect(isBlackedOut(ROOM, '2026-07-05', '10:00:00', '12:00:00', [rec()])).toBe(true);
  });
  it('matching day + non-overlapping time → false', () => {
    expect(isBlackedOut(ROOM, '2026-07-05', '12:00:00', '14:00:00', [rec()])).toBe(false);
  });
  it('non-matching weekday (Tuesday) → false', () => {
    expect(isBlackedOut(ROOM, '2026-07-07', '10:00:00', '12:00:00', [rec()])).toBe(false);
  });
  it('date before dateStart → false', () => {
    expect(isBlackedOut(ROOM, '2026-06-28', '10:00:00', '12:00:00', [rec()])).toBe(false);
  });
  it('date after dateEnd → false', () => {
    expect(isBlackedOut(ROOM, '2026-08-03', '10:00:00', '12:00:00', [rec()])).toBe(false);
  });
  it('dateStart boundary (Wed 2026-07-01) — not in BYDAY → false', () => {
    expect(isBlackedOut(ROOM, '2026-07-01', '10:00:00', '12:00:00', [rec()])).toBe(false);
  });
  it('dateEnd boundary (Fri 2026-07-31) — not in BYDAY → false', () => {
    expect(isBlackedOut(ROOM, '2026-07-31', '10:00:00', '12:00:00', [rec()])).toBe(false);
  });

  it('KST weekday: 2026-07-05 is Sunday(0) → blocked; 2026-07-06 Monday(1) → passes Sunday-only rule', () => {
    const sunOnly = rec({ recurringRule: 'FREQ=WEEKLY;BYDAY=SU' });
    expect(isBlackedOut(ROOM, '2026-07-05', '10:00:00', '12:00:00', [sunOnly])).toBe(true);
    expect(isBlackedOut(ROOM, '2026-07-06', '10:00:00', '12:00:00', [sunOnly])).toBe(false);
  });
});

// ── RRULE throw (C20.5 파서 역할) ────────────────────────────────────────────
describe('isBlackedOut — RRULE throw', () => {
  const ruleFixture = (recurringRule: string) =>
    bk({
      scope: 'recurring',
      dateStart: dt('2026-07-01'),
      dateEnd: dt('2026-07-31'),
      timeStart: tm(10, 0),
      timeEnd: tm(12, 0),
      recurringRule,
    });

  it('throws on unsupported FREQ=MONTHLY', () => {
    expect(() =>
      isBlackedOut(ROOM, '2026-07-06', '10:00:00', '12:00:00', [
        ruleFixture('FREQ=MONTHLY;BYDAY=MO'),
      ]),
    ).toThrow('Unsupported RRULE FREQ (S2.5a parses WEEKLY only)');
  });
  it('throws when BYDAY missing', () => {
    expect(() =>
      isBlackedOut(ROOM, '2026-07-06', '10:00:00', '12:00:00', [ruleFixture('FREQ=WEEKLY')]),
    ).toThrow('RRULE missing BYDAY');
  });
  it('throws on invalid BYDAY token', () => {
    expect(() =>
      isBlackedOut(ROOM, '2026-07-06', '10:00:00', '12:00:00', [
        ruleFixture('FREQ=WEEKLY;BYDAY=MO,XX'),
      ]),
    ).toThrow('Invalid BYDAY token');
  });
});

// ── DB CHECK constraint (실 DB — 각 INSERT가 거부되어야 함) ───────────────────
describe('DB CHECK constraint — scope matrix guard', () => {
  it('rejects slot with time_start=NULL (slot 가지 NOT NULL 위반)', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO blackouts (id, scope, date_start, date_end, time_start, time_end, recurring_rule, reason, created_at, updated_at)
        VALUES ('ck-slot-null-time', 'slot', '2026-07-10', '2026-07-10', NULL, NULL, NULL, 'internal_use', NOW(), NOW())
      `,
    ).rejects.toThrow();
  });

  it('rejects full_day with time_start set (full_day 가지 IS NULL 위반)', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO blackouts (id, scope, date_start, date_end, time_start, time_end, recurring_rule, reason, created_at, updated_at)
        VALUES ('ck-full-day-has-time', 'full_day', '2026-07-10', '2026-07-10', '10:00:00', '12:00:00', NULL, 'internal_use', NOW(), NOW())
      `,
    ).rejects.toThrow();
  });

  it('rejects recurring with empty recurring_rule (LIKE FREQ=% guard)', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO blackouts (id, scope, date_start, date_end, time_start, time_end, recurring_rule, reason, created_at, updated_at)
        VALUES ('ck-recurring-empty', 'recurring', '2026-07-01', '2026-07-31', '10:00:00', '12:00:00', '', 'internal_use', NOW(), NOW())
      `,
    ).rejects.toThrow();
  });

  it('rejects recurring with non-RRULE string (LIKE FREQ=% guard)', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO blackouts (id, scope, date_start, date_end, time_start, time_end, recurring_rule, reason, created_at, updated_at)
        VALUES ('ck-recurring-invalid', 'recurring', '2026-07-01', '2026-07-31', '10:00:00', '12:00:00', 'BYDAY=MO', 'internal_use', NOW(), NOW())
      `,
    ).rejects.toThrow();
  });
});
