import type { Package, PricingMode } from '@prisma/client';

// Only the fields pricing needs — keeps the calculator pure and trivially testable.
export type PricingInput = Pick<
  Package,
  'basePriceKrw' | 'pricingMode' | 'headcountMin' | 'headcountMax'
>;

export type PricingBasis = {
  mode: PricingMode;
  base: number;
  headcount: number;
  multiplier?: number; // experience only
  computedTotal: number;
};
export type PriceResult = { unitPriceKrw: number; totalKrw: number; basis: PricingBasis };

// 💰 Money-critical. Returns the charged total + a `basis` structure that the M3 booking
// freezes into Booking.pricingSnapshot (§3.2). Throws RangeError on out-of-range headcount
// (fail-safe — never silently mischarge). Spec: 2026-06-19-m2-package-catalog-design.md.
export function computePackageTotal(pkg: PricingInput, headcount: number): PriceResult {
  if (
    !Number.isInteger(headcount) ||
    headcount < pkg.headcountMin ||
    headcount > pkg.headcountMax
  ) {
    throw new RangeError(
      `headcount ${headcount} out of range [${pkg.headcountMin}, ${pkg.headcountMax}]`,
    );
  }
  const base = pkg.basePriceKrw;
  switch (pkg.pricingMode) {
    case 'per_person_x1_5': {
      const multiplier = 1 + 0.5 * (headcount - 1);
      // integer-exact: base is even, so base*(n-1) is even → /2 is an integer
      const computedTotal = base + (base * (headcount - 1)) / 2;
      return {
        unitPriceKrw: base,
        totalKrw: computedTotal,
        basis: { mode: pkg.pricingMode, base, headcount, multiplier, computedTotal },
      };
    }
    case 'flat':
      return {
        unitPriceKrw: base,
        totalKrw: base,
        basis: { mode: pkg.pricingMode, base, headcount, computedTotal: base },
      };
    case 'per_head': {
      const computedTotal = base * headcount;
      return {
        unitPriceKrw: base,
        totalKrw: computedTotal,
        basis: { mode: pkg.pricingMode, base, headcount, computedTotal },
      };
    }
  }
}
