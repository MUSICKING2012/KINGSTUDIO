import type { BookingStatus } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { isBlackedOut } from './blackout';
import {
  PACKAGE_SLOT_MINUTES,
  PACKAGE_START_TIMES,
  type PackageTier,
  SLOT_START_MINUTE,
} from './constants';
import { overlaps, prismaTimeToStr, toKstTimeString } from './time';

export type AvailableSlot = {
  startTime: string; // "HH:MM:00" KST naive
  endTime: string; // "HH:MM:00" KST naive
  packageTier: PackageTier;
};

const ACTIVE_STATUSES: BookingStatus[] = ['paid', 'confirmed', 'completed'];

const FALLBACK_HOURS = { open: '10:00', close: '22:00' } as const;

// Normalise "HH:MM" to "HH:MM:00" so comparisons with toKstTimeString output are consistent.
function normTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}

export async function getAvailability(roomId: string, date: string): Promise<AvailableSlot[]> {
  const dateObj = new Date(date);
  const [setting, bookings, blackouts] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'operating_hours' } }),
    prisma.booking.findMany({
      where: {
        roomId,
        date: dateObj, // @db.Date — Prisma sends date-only; epoch prohibition is for start/end time columns
        status: { in: ACTIVE_STATUSES },
      },
      select: { startTime: true, endTime: true },
    }),
    // Fetch all blackouts whose date range covers this date, for this room or all rooms (null).
    // isBlackedOut handles scope-specific matching (slot/full_day/recurring + time overlap).
    prisma.blackout.findMany({
      where: {
        AND: [
          { dateStart: { lte: dateObj } },
          { dateEnd: { gte: dateObj } },
          { OR: [{ roomId }, { roomId: null }] },
        ],
      },
    }),
  ]);

  // Fail-safe: absent or malformed setting → PRD C19 default 10:00–22:00
  const raw = setting?.value as Record<string, unknown> | null | undefined;
  const open = normTime(typeof raw?.open === 'string' ? raw.open : FALLBACK_HOURS.open);
  const close = normTime(typeof raw?.close === 'string' ? raw.close : FALLBACK_HOURS.close);

  const booked = bookings.map((b) => ({
    start: prismaTimeToStr(b.startTime),
    end: prismaTimeToStr(b.endTime),
  }));

  const slots: AvailableSlot[] = [];

  for (const [pkg, startHours] of Object.entries(PACKAGE_START_TIMES) as [
    PackageTier,
    number[],
  ][]) {
    const slotMin = PACKAGE_SLOT_MINUTES[pkg];

    for (const h of startHours) {
      const startTime = toKstTimeString(h, SLOT_START_MINUTE);
      const endTime = toKstTimeString(h + Math.floor(slotMin / 60), slotMin % 60);

      // Exclude slots outside the operating window
      if (startTime < open || endTime > close) continue;

      // Exclude slots that overlap any active booking
      if (booked.some((b) => overlaps(startTime, endTime, b.start, b.end))) continue;

      // Exclude slots covered by a blackout (scope-aware: slot/full_day/recurring)
      if (isBlackedOut(roomId, date, startTime, endTime, blackouts)) continue;

      slots.push({ startTime, endTime, packageTier: pkg });
    }
  }

  return slots;
}
