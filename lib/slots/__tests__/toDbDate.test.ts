import { describe, it, expect } from 'vitest';
import { toDbDate } from '../time';
import { assertDateString } from '../time';

describe('toDbDate — @db.Date write carrier', () => {
  it('기준: "2026-06-24" → Date.UTC(2026,5,24)', () => {
    expect(toDbDate('2026-06-24').getTime()).toBe(Date.UTC(2026, 5, 24));
  });

  it('경계: "2026-01-01" → Date.UTC(2026,0,1)', () => {
    expect(toDbDate('2026-01-01').getTime()).toBe(Date.UTC(2026, 0, 1));
  });

  it('경계: "2026-12-31" → Date.UTC(2026,11,31)', () => {
    expect(toDbDate('2026-12-31').getTime()).toBe(Date.UTC(2026, 11, 31));
  });

  it('트립와이어: datetime이 carrier에 도달 못 함(assertDateString이 먼저 throw)', () => {
    expect(() => assertDateString('2026-06-24T00:00:00')).toThrow();
  });
});
