import { describe, expect, it } from 'vitest';
import { DISCOUNT_CAP_KRW, computeTenPercentCapped, resolveDiscounts } from './discount';

// 💰 Money-critical (§4). Covers the pure discount-resolution layer: 10%/cap math, mutual exclusion
// (max one), returning-priority tie-break, the referral structural hook, and fail-loud guards.

describe('computeTenPercentCapped', () => {
  it('takes 10% of the subtotal when below the cap', () => {
    // Gold 1p = 400,000 → 40,000 (< 50,000 cap).
    expect(computeTenPercentCapped(400_000)).toBe(40_000);
  });

  it('caps at ₩50,000', () => {
    // Diamond 1p = 500,000 → 50,000 (exactly cap); Premium 1p = 1,500,000 → 150,000 → capped.
    expect(computeTenPercentCapped(500_000)).toBe(50_000);
    expect(computeTenPercentCapped(1_500_000)).toBe(DISCOUNT_CAP_KRW);
  });

  it('floors sub-won fractions (never over-discounts)', () => {
    // 123,455 × 10% = 12,345.5 → floor 12,345.
    expect(computeTenPercentCapped(123_455)).toBe(12_345);
  });

  it('rejects a non-positive or non-integer subtotal (fail loud)', () => {
    expect(() => computeTenPercentCapped(0)).toThrow(RangeError);
    expect(() => computeTenPercentCapped(-100)).toThrow(RangeError);
    expect(() => computeTenPercentCapped(1_000.5)).toThrow(RangeError);
  });
});

describe('resolveDiscounts — returning only (current Stage; referral hook idle)', () => {
  it('applies the returning discount on the headcount total when eligible', () => {
    // Gold 3p headcount total = 400,000 × (1 + 0.5×2) = 800,000 → 10% = 80,000 → capped 50,000.
    const r = resolveDiscounts({ subtotalKrw: 800_000, returningEligible: true });
    expect(r.applied).toEqual({ type: 'returning', amountKrw: 50_000 });
    expect(r.totalKrw).toBe(750_000);
    expect(r.returningDiscountKrw).toBe(50_000);
  });

  it('applies under-cap returning discount and reports the snapshot', () => {
    const r = resolveDiscounts({ subtotalKrw: 400_000, returningEligible: true });
    expect(r.applied).toEqual({ type: 'returning', amountKrw: 40_000 });
    expect(r.totalKrw).toBe(360_000);
    expect(r.returningDiscountKrw).toBe(40_000);
    expect(r.snapshot.rule).toBe('mutual_exclusive_max_one_returning_priority');
    expect(r.snapshot.capKrw).toBe(50_000);
    expect(r.snapshot.candidates).toHaveLength(1);
  });

  it('applies nothing when the booker is not eligible', () => {
    const r = resolveDiscounts({ subtotalKrw: 400_000, returningEligible: false });
    expect(r.applied).toBeNull();
    expect(r.totalKrw).toBe(400_000);
    expect(r.returningDiscountKrw).toBeNull();
    expect(r.snapshot.candidates).toHaveLength(0);
  });
});

describe('resolveDiscounts — mutual exclusion (max one, most favourable, returning tie-break)', () => {
  it('picks returning over an equal-amount referral (tie → returning)', () => {
    // Both are 10%-of-500,000 capped = 50,000 → equal → returning wins, referral untouched.
    const r = resolveDiscounts({
      subtotalKrw: 500_000,
      returningEligible: true,
      referralCandidateKrw: 50_000,
    });
    expect(r.applied).toEqual({ type: 'returning', amountKrw: 50_000 });
    expect(r.returningDiscountKrw).toBe(50_000);
    expect(r.snapshot.candidates).toHaveLength(2);
  });

  it('picks the referral when it is strictly larger', () => {
    // Returning = 10% of 300,000 = 30,000; a (hypothetical) larger referral of 45,000 wins.
    const r = resolveDiscounts({
      subtotalKrw: 300_000,
      returningEligible: true,
      referralCandidateKrw: 45_000,
    });
    expect(r.applied).toEqual({ type: 'referral', amountKrw: 45_000 });
    // Referral chosen → Booking.returningDiscountKrw stays null (referral tracked on Referral row).
    expect(r.returningDiscountKrw).toBeNull();
    expect(r.totalKrw).toBe(255_000);
  });

  it('uses the referral alone when the booker is not returning-eligible', () => {
    const r = resolveDiscounts({
      subtotalKrw: 400_000,
      returningEligible: false,
      referralCandidateKrw: 40_000,
    });
    expect(r.applied).toEqual({ type: 'referral', amountKrw: 40_000 });
    expect(r.returningDiscountKrw).toBeNull();
    expect(r.totalKrw).toBe(360_000);
  });

  it('never lets a referral candidate exceed the cap or the subtotal', () => {
    // Stray oversized referral is clamped to the ₩50,000 cap.
    const r = resolveDiscounts({
      subtotalKrw: 500_000,
      returningEligible: false,
      referralCandidateKrw: 999_999,
    });
    expect(r.applied).toEqual({ type: 'referral', amountKrw: DISCOUNT_CAP_KRW });
    expect(r.totalKrw).toBe(450_000);
  });
});

describe('resolveDiscounts — guards', () => {
  it('treats a null/undefined/zero referral hook as no referral', () => {
    const base = { subtotalKrw: 400_000, returningEligible: false };
    expect(resolveDiscounts({ ...base, referralCandidateKrw: null }).applied).toBeNull();
    expect(resolveDiscounts({ ...base, referralCandidateKrw: undefined }).applied).toBeNull();
    expect(resolveDiscounts({ ...base, referralCandidateKrw: 0 }).applied).toBeNull();
  });

  it('rejects a negative or non-integer referral amount (fail loud)', () => {
    expect(() =>
      resolveDiscounts({
        subtotalKrw: 400_000,
        returningEligible: false,
        referralCandidateKrw: -1,
      }),
    ).toThrow(RangeError);
    expect(() =>
      resolveDiscounts({
        subtotalKrw: 400_000,
        returningEligible: false,
        referralCandidateKrw: 1_000.5,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a non-positive subtotal (fail loud)', () => {
    expect(() => resolveDiscounts({ subtotalKrw: 0, returningEligible: true })).toThrow(RangeError);
  });
});
