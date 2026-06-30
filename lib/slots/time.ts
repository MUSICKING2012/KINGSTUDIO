// KST wall-clock helpers for slot date/time columns (PRD C19 storage convention).
// Columns are `date` / `time without time zone` — always KST naive, never UTC-derived.
//
// spec:
// - toKstDateString(date: Date): string  → "YYYY-MM-DD" KST 벽시계
// - toKstTimeString(h: number, m: number): string → "HH:MM:00" (정수 시·분만 받음)
// - assertDateString(date: string): void → 진입점 가드 — "YYYY-MM-DD" 외 throw
// - JS Date 입력은 toKstDateString 하나만 — 내부에서 UTC+9 offset 산술로 변환
// - Date.getTime() / UTC epoch 기반 변환 금지 (PRD C19 KST naive 규약)
// - toKstTimeString은 Date 입력 없음 — 정수 산술만

export class InvalidDateInputError extends Error {
  constructor(date: string) {
    super(`date must be "YYYY-MM-DD", got: ${JSON.stringify(date)}`);
    this.name = 'InvalidDateInputError';
  }
}

// Guards entry-points that accept a KST date string — throws before any DB/Redis call.
export function assertDateString(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new InvalidDateInputError(date);
  }
}

const KST_OFFSET_H = 9;

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, mo: number): number {
  if (mo === 2) return isLeapYear(y) ? 29 : 28;
  return [0, 31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo]!;
}

// Converts a JS Date to the KST wall-clock date string for the `date` column.
export function toKstDateString(date: Date): string {
  let y = date.getUTCFullYear();
  let mo = date.getUTCMonth() + 1; // 1-based
  let d = date.getUTCDate();

  if (date.getUTCHours() + KST_OFFSET_H >= 24) {
    d++;
    if (d > daysInMonth(y, mo)) {
      d = 1;
      mo++;
      if (mo > 12) {
        mo = 1;
        y++;
      }
    }
  }

  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Builds a `time without time zone` string from integer hours + minutes.
// Slot times are derived from the fixed slot grid and operating-window constants —
// never from a JS Date / UTC epoch (PRD C19: Date.getTime() forbidden on slot times).
export function toKstTimeString(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

// Half-open interval overlap: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅  iff  aStart < bEnd && bStart < aEnd.
// String lex order is valid for zero-padded "HH:MM:00" in 00:00–23:59 range (PRD C19 constraint).
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// Converts a Prisma @db.Time(0) value (Date rooted at 1970-01-01T00:00:00Z) to "HH:MM:00".
// Uses getUTCHours/getUTCMinutes because Prisma represents time-without-timezone as UTC epoch + offset.
// This is the read path only — not slot creation from a real-world Date (PRD C19 epoch ban applies there).
export function prismaTimeToStr(d: Date): string {
  return toKstTimeString(d.getUTCHours(), d.getUTCMinutes());
}

/** @db.Date write carrier. 입력은 호출부에서 assertDateString 통과한 "YYYY-MM-DD" date-only.
 *  date-only는 ES 스펙상 UTC 자정으로 파싱되므로 TZ 독립. assert/정규화는 상류 중복이라 안 넣음. */
export function toDbDate(s: string): Date {
  return new Date(s);
}

// Write-path adapter: converts "HH:MM:00" KST naive string to the Date carrier
// Prisma requires for @db.Time(0). Not epoch arithmetic for time derivation (PRD C19).
export function toTimeDate(t: string): Date {
  return new Date(`1970-01-01T${t}.000Z`);
}
