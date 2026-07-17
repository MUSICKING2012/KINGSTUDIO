import { describe, expect, it } from 'vitest';
import { InvalidDateInputError, assertDateString, toKstDateString, toKstTimeString } from '../time';

describe('toKstDateString', () => {
  it('returns YYYY-MM-DD in KST wall-clock, not UTC', () => {
    // 2026-07-01T15:30:00Z = 2026-07-02T00:30:00 KST → date must be July 2
    expect(toKstDateString(new Date('2026-07-01T15:30:00Z'))).toBe('2026-07-02');
  });

  it('stays on the same date when UTC and KST share the day', () => {
    // 2026-07-01T10:00:00Z = 2026-07-01T19:00:00 KST → still July 1
    expect(toKstDateString(new Date('2026-07-01T10:00:00Z'))).toBe('2026-07-01');
  });

  it('handles the last second before KST midnight (23:59:59 KST = 14:59:59 UTC)', () => {
    expect(toKstDateString(new Date('2026-07-01T14:59:59Z'))).toBe('2026-07-01');
  });

  it('handles exactly KST midnight (00:00:00 KST = 15:00:00 UTC previous day)', () => {
    expect(toKstDateString(new Date('2026-07-01T15:00:00Z'))).toBe('2026-07-02');
  });
});

describe('toKstDateString month/year rollover (daysInMonth)', () => {
  it('rolls into next month at a 31-day month-end', () => {
    // 2026-07-31T15:00:00Z = 2026-08-01 KST
    expect(toKstDateString(new Date('2026-07-31T15:00:00Z'))).toBe('2026-08-01');
  });
  it('rolls into next month from a 30-day month', () => {
    // 2026-04-30T15:00:00Z = 2026-05-01 KST
    expect(toKstDateString(new Date('2026-04-30T15:00:00Z'))).toBe('2026-05-01');
  });
  it('rolls into next year at Dec 31', () => {
    // 2026-12-31T15:00:00Z = 2027-01-01 KST
    expect(toKstDateString(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01');
  });
  it('non-leap February ends at 28 (2026)', () => {
    // 2026-02-28T15:00:00Z = 2026-03-01 KST
    expect(toKstDateString(new Date('2026-02-28T15:00:00Z'))).toBe('2026-03-01');
  });
  it('leap February keeps Feb 29 (2028)', () => {
    // 2028-02-28T15:00:00Z = 2028-02-29 KST
    expect(toKstDateString(new Date('2028-02-28T15:00:00Z'))).toBe('2028-02-29');
  });
  it('leap February rolls to March at Feb 29 (2028)', () => {
    // 2028-02-29T15:00:00Z = 2028-03-01 KST
    expect(toKstDateString(new Date('2028-02-29T15:00:00Z'))).toBe('2028-03-01');
  });
});

describe('toKstTimeString', () => {
  it('formats single-digit hours and minutes with leading zeros', () => {
    expect(toKstTimeString(9, 0)).toBe('09:00:00');
    expect(toKstTimeString(9, 30)).toBe('09:30:00');
  });

  it('formats double-digit hours and minutes', () => {
    expect(toKstTimeString(10, 0)).toBe('10:00:00');
    expect(toKstTimeString(22, 0)).toBe('22:00:00');
    expect(toKstTimeString(13, 30)).toBe('13:30:00');
  });

  it('always appends :00 seconds', () => {
    expect(toKstTimeString(12, 0).endsWith(':00')).toBe(true);
    expect(toKstTimeString(18, 30).endsWith(':00')).toBe(true);
  });
});

describe('assertDateString', () => {
  it('accepts a valid YYYY-MM-DD string', () => {
    expect(() => assertDateString('2026-06-26')).not.toThrow();
  });

  it.each([
    '2026-6-26',
    '2026-06-26T00:00:00',
    '2026/06/26',
    '',
    '  2026-06-26',
  ])('rejects %j with InvalidDateInputError', (bad) => {
    expect(() => assertDateString(bad)).toThrowError(InvalidDateInputError);
  });
});
