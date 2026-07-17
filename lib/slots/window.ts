// Booking window = D+1 .. D+90 inclusive, in KST wall-clock (PRD §5.3 "D+1부터 D+90까지 예약
// 가능, 표시 시간대는 KST 고정"). PURE (no prisma) and injectable `now` → unit-testable.
//
// The day-shift below uses UTC-anchored Date arithmetic on a date-only string. This is a
// CALENDAR-RANGE guard, not slot-time derivation, so the C19 epoch ban (which targets
// start_time/end_time) does not apply. `todayKstDateString` is the only real-world-time read and
// goes through toKstDateString (the sanctioned Date → KST wall-date helper).

import { toKstDateString } from './time';

export const BOOKING_MIN_OFFSET = 1;
export const BOOKING_MAX_OFFSET = 90;

function shiftDateString(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type BookingWindow = { today: string; minDate: string; maxDate: string };

export function bookingWindow(now: Date = new Date()): BookingWindow {
  const today = toKstDateString(now);
  return {
    today,
    minDate: shiftDateString(today, BOOKING_MIN_OFFSET),
    maxDate: shiftDateString(today, BOOKING_MAX_OFFSET),
  };
}

// Lexicographic compare is valid for zero-padded YYYY-MM-DD (chronological order).
export function isWithinBookingWindow(date: string, now: Date = new Date()): boolean {
  const { minDate, maxDate } = bookingWindow(now);
  return date >= minDate && date <= maxDate;
}
