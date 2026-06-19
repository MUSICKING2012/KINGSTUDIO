import { describe, expect, it } from 'vitest';
import { computePackageTotal } from './pricing';

// Minimal package inputs (only the fields pricing reads).
const experience = (basePriceKrw: number, headcountMax: number) => ({
  basePriceKrw,
  pricingMode: 'per_person_x1_5' as const,
  headcountMin: 1,
  headcountMax,
});
const gold = experience(400_000, 2);
const diamond = experience(500_000, 5);
const premium = experience(1_500_000, 5);
const oneHour = {
  basePriceKrw: 100_000,
  pricingMode: 'flat' as const,
  headcountMin: 1,
  headcountMax: 5,
};
const onePro = {
  basePriceKrw: 300_000,
  pricingMode: 'flat' as const,
  headcountMin: 1,
  headcountMax: 5,
};
const makingClass = {
  basePriceKrw: 150_000,
  pricingMode: 'per_head' as const,
  headcountMin: 2,
  headcountMax: 15,
};
const dreampath = {
  basePriceKrw: 30_000,
  pricingMode: 'per_head' as const,
  headcountMin: 10,
  headcountMax: 15,
};

describe('computePackageTotal — experience per-head +50% multiplier', () => {
  it('applies multiplier 1.0/1.5/2.0/2.5/3.0 for headcount 1..5', () => {
    const mults = [1, 2, 3, 4, 5].map((n) => computePackageTotal(diamond, n).basis.multiplier);
    expect(mults).toEqual([1.0, 1.5, 2.0, 2.5, 3.0]);
  });
  it('Diamond representative KRW values', () => {
    expect([1, 2, 3, 4, 5].map((n) => computePackageTotal(diamond, n).totalKrw)).toEqual([
      500_000, 750_000, 1_000_000, 1_250_000, 1_500_000,
    ]);
  });
  it('Premium 5인 = 4,500,000 and 1인 = 1,500,000', () => {
    expect(computePackageTotal(premium, 5).totalKrw).toBe(4_500_000);
    expect(computePackageTotal(premium, 1).totalKrw).toBe(1_500_000);
  });
  it('Gold 1·2인 = 400,000 / 600,000', () => {
    expect(computePackageTotal(gold, 1).totalKrw).toBe(400_000);
    expect(computePackageTotal(gold, 2).totalKrw).toBe(600_000);
  });
  it('unitPriceKrw is always the per-person base', () => {
    expect(computePackageTotal(diamond, 3).unitPriceKrw).toBe(500_000);
  });
});

describe('computePackageTotal — boundaries (fail-safe, no silent mischarge)', () => {
  it('rejects headcount above max', () => {
    expect(() => computePackageTotal(diamond, 6)).toThrow(RangeError);
    expect(() => computePackageTotal(gold, 3)).toThrow(RangeError);
  });
  it('rejects headcount 0 and below min', () => {
    expect(() => computePackageTotal(diamond, 0)).toThrow(RangeError);
    expect(() => computePackageTotal(dreampath, 9)).toThrow(RangeError);
  });
  it('rejects non-integer headcount', () => {
    expect(() => computePackageTotal(diamond, 2.5)).toThrow(RangeError);
  });
});

describe('computePackageTotal — rental flat invariance', () => {
  it('1Hour/1Pro return base for every headcount 1..5', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      expect(computePackageTotal(oneHour, n).totalKrw).toBe(100_000);
      expect(computePackageTotal(onePro, n).totalKrw).toBe(300_000);
    }
  });
});

describe('computePackageTotal — group per-head', () => {
  it('Making Class 2→300,000, 15→2,250,000; dreampath 10→300,000', () => {
    expect(computePackageTotal(makingClass, 2).totalKrw).toBe(300_000);
    expect(computePackageTotal(makingClass, 15).totalKrw).toBe(2_250_000);
    expect(computePackageTotal(dreampath, 10).totalKrw).toBe(300_000);
  });
});
