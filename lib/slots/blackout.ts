import type { Blackout } from '@prisma/client';
import { overlaps, prismaTimeToStr, toKstDateString } from './time';

const BYDAY: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

function kstWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function weeklyRuleMatches(rule: string, dateStr: string): boolean {
  const parts = Object.fromEntries(rule.split(';').map((p) => p.split('=') as [string, string]));
  if (parts.FREQ !== 'WEEKLY') {
    throw new Error(`Unsupported RRULE FREQ (S2.5a parses WEEKLY only): ${rule}`);
  }
  if (!parts.BYDAY) {
    throw new Error(`RRULE missing BYDAY: ${rule}`);
  }
  const days = parts.BYDAY.split(',').map((tok) => {
    if (!(tok in BYDAY)) throw new Error(`Invalid BYDAY token: ${tok}`);
    return BYDAY[tok];
  });
  return days.includes(kstWeekday(dateStr));
}

export function isBlackedOut(
  roomId: string,
  date: string,
  slotStart: string,
  slotEnd: string,
  blackouts: Blackout[],
): boolean {
  for (const b of blackouts) {
    if (b.roomId !== null && b.roomId !== roomId) continue;

    const dStart = toKstDateString(b.dateStart);
    const dEnd = toKstDateString(b.dateEnd);

    if (b.scope === 'slot') {
      if (date !== dStart) continue;
      if (b.timeStart === null || b.timeEnd === null) continue;
      if (overlaps(slotStart, slotEnd, prismaTimeToStr(b.timeStart), prismaTimeToStr(b.timeEnd))) {
        return true;
      }
    } else if (b.scope === 'full_day') {
      if (date >= dStart && date <= dEnd) return true;
    } else if (b.scope === 'recurring') {
      if (date < dStart || date > dEnd) continue;
      if (b.recurringRule === null) continue;
      if (!weeklyRuleMatches(b.recurringRule, date)) continue;
      if (b.timeStart === null || b.timeEnd === null) continue;
      if (overlaps(slotStart, slotEnd, prismaTimeToStr(b.timeStart), prismaTimeToStr(b.timeEnd))) {
        return true;
      }
    }
  }
  return false;
}
