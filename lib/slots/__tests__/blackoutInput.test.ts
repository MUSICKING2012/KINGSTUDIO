import { describe, expect, it } from 'vitest';
import { BlackoutValidationError, validateBlackoutInput } from '../blackoutInput';

const slotBase = {
  scope: 'slot' as const,
  dateStart: '2026-07-10',
  dateEnd: '2026-07-10',
  reason: 'internal_use',
  timeStart: { h: 10, m: 0 },
  timeEnd: { h: 12, m: 0 },
};

// ── slot ──────────────────────────────────────────────────────────────────────
describe('validateBlackoutInput — slot', () => {
  it('valid slot → normalized output', () => {
    const r = validateBlackoutInput(slotBase);
    expect(r.scope).toBe('slot');
    expect(r.timeStart).toBe('10:00:00');
    expect(r.timeEnd).toBe('12:00:00');
    expect(r.recurringRule).toBeNull();
    expect(r.roomId).toBeNull();
    expect(r.reasonNote).toBeNull();
  });

  it('slot dateStart !== dateEnd → BlackoutValidationError', () => {
    expect(() =>
      validateBlackoutInput({ ...slotBase, dateEnd: '2026-07-11' }),
    ).toThrow(BlackoutValidationError);
  });

  it('slot with recurringRule → BlackoutValidationError', () => {
    expect(() =>
      validateBlackoutInput({ ...slotBase, recurringRule: 'FREQ=WEEKLY;BYDAY=MO' }),
    ).toThrow(BlackoutValidationError);
  });

  it('time reversed (timeStart >= timeEnd) → BlackoutValidationError', () => {
    expect(() =>
      validateBlackoutInput({ ...slotBase, timeStart: { h: 12, m: 0 }, timeEnd: { h: 10, m: 0 } }),
    ).toThrow(BlackoutValidationError);
  });

  it('time equal (timeStart === timeEnd) → BlackoutValidationError', () => {
    expect(() =>
      validateBlackoutInput({ ...slotBase, timeStart: { h: 10, m: 0 }, timeEnd: { h: 10, m: 0 } }),
    ).toThrow(BlackoutValidationError);
  });

  it('h out of range (h=24) → BlackoutValidationError', () => {
    expect(() =>
      validateBlackoutInput({ ...slotBase, timeStart: { h: 24, m: 0 } }),
    ).toThrow(BlackoutValidationError);
  });

  it('m out of range (m=60) → BlackoutValidationError', () => {
    expect(() =>
      validateBlackoutInput({ ...slotBase, timeStart: { h: 10, m: 60 } }),
    ).toThrow(BlackoutValidationError);
  });

  it('invalid dateStart format → BlackoutValidationError', () => {
    expect(() =>
      validateBlackoutInput({ ...slotBase, dateStart: '2026-7-10', dateEnd: '2026-7-10' }),
    ).toThrow(BlackoutValidationError);
  });
});

// ── full_day ──────────────────────────────────────────────────────────────────
describe('validateBlackoutInput — full_day', () => {
  it('valid full_day → normalized output', () => {
    const r = validateBlackoutInput({
      scope: 'full_day',
      dateStart: '2026-07-10',
      dateEnd: '2026-07-14',
      reason: 'holiday',
    });
    expect(r.scope).toBe('full_day');
    expect(r.timeStart).toBeNull();
    expect(r.timeEnd).toBeNull();
    expect(r.recurringRule).toBeNull();
  });

  it('full_day with timeStart → BlackoutValidationError', () => {
    expect(() =>
      validateBlackoutInput({
        scope: 'full_day',
        dateStart: '2026-07-10',
        dateEnd: '2026-07-14',
        reason: 'holiday',
        timeStart: { h: 10, m: 0 },
      }),
    ).toThrow(BlackoutValidationError);
  });
});

// ── recurring ─────────────────────────────────────────────────────────────────
describe('validateBlackoutInput — recurring', () => {
  const recBase = {
    scope: 'recurring' as const,
    dateStart: '2026-07-01',
    dateEnd: '2026-07-31',
    reason: 'maintenance',
    recurringRule: 'FREQ=WEEKLY;BYDAY=SU,MO',
    timeStart: { h: 10, m: 0 },
    timeEnd: { h: 12, m: 0 },
  };

  it('valid recurring → normalized output', () => {
    const r = validateBlackoutInput(recBase);
    expect(r.scope).toBe('recurring');
    expect(r.recurringRule).toBe('FREQ=WEEKLY;BYDAY=SU,MO');
    expect(r.timeStart).toBe('10:00:00');
    expect(r.timeEnd).toBe('12:00:00');
  });

  it('recurring with FREQ=MONTHLY → BlackoutValidationError', () => {
    expect(() =>
      validateBlackoutInput({ ...recBase, recurringRule: 'FREQ=MONTHLY;BYDAY=MO' }),
    ).toThrow(BlackoutValidationError);
  });

  it('recurring missing BYDAY → BlackoutValidationError', () => {
    expect(() =>
      validateBlackoutInput({ ...recBase, recurringRule: 'FREQ=WEEKLY' }),
    ).toThrow(BlackoutValidationError);
  });
});
