import { describe, expect, it } from 'vitest';

import { computePgFeeKrw } from './fees';

describe('computePgFeeKrw', () => {
  it('inicis = 3.0% floored, no fixed', () => {
    expect(computePgFeeKrw('inicis', 600_000)).toBe(18_000); // 600000 * 3% = 18000
    expect(computePgFeeKrw('inicis', 400_000)).toBe(12_000);
    expect(computePgFeeKrw('inicis', 1_500_000)).toBe(45_000);
  });

  it('paypal = 4.4% floored + ₩560 fixed', () => {
    expect(computePgFeeKrw('paypal', 600_000)).toBe(26_400 + 560); // 600000*4.4%=26400
    expect(computePgFeeKrw('paypal', 400_000)).toBe(17_600 + 560);
  });

  it('floors the percentage part (never overstates the deduction)', () => {
    // 333_333 * 3% = 9999.99 → floor 9999
    expect(computePgFeeKrw('inicis', 333_333)).toBe(9_999);
    // 100_003 * 4.4% = 4400.132 → floor 4400, + 560
    expect(computePgFeeKrw('paypal', 100_003)).toBe(4_400 + 560);
  });

  it('rejects non-positive / non-integer amounts', () => {
    expect(() => computePgFeeKrw('inicis', 0)).toThrow(RangeError);
    expect(() => computePgFeeKrw('inicis', -1)).toThrow(RangeError);
    expect(() => computePgFeeKrw('paypal', 1000.5)).toThrow(RangeError);
  });
});
