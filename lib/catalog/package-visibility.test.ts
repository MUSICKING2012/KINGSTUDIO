import type { Package } from '@prisma/client';
import { BookingFlow, Locale, PackageCategory, PricingMode } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { isPackageBookableOnline, isPackageViewable } from './package-visibility';

const base: Omit<Package, 'languagesAvailable'> = {
  id: 'x',
  slug: 'gold',
  category: PackageCategory.experience,
  name: 'Gold',
  basePriceKrw: 400000,
  pricingMode: PricingMode.per_person_x1_5,
  slotMinutes: 120,
  headcountMin: 1,
  headcountMax: 2,
  bookingFlow: BookingFlow.instant_payment,
  friendReferralEligible: false,
  returningDiscountEligible: false,
  cdIncluded: false,
  isActive: true,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('isPackageViewable', () => {
  it('null → false', () => expect(isPackageViewable(null, Locale.ko)).toBe(false));
  it('inactive → false', () =>
    expect(
      isPackageViewable({ ...base, isActive: false, languagesAvailable: [Locale.ko] }, Locale.ko),
    ).toBe(false));
  it('ko-only package on en → false', () =>
    expect(isPackageViewable({ ...base, languagesAvailable: [Locale.ko] }, Locale.en)).toBe(false));
  it('all-locale package on en → true', () =>
    expect(
      isPackageViewable(
        {
          ...base,
          languagesAvailable: [Locale.ko, Locale.en, Locale.ja, Locale.zh_HK, Locale.zh_CN],
        },
        Locale.en,
      ),
    ).toBe(true));
});

describe('isPackageBookableOnline (bookingFlow authoritative gate — PRD §5.3 group exception)', () => {
  it('instant_payment → true', () =>
    expect(isPackageBookableOnline({ bookingFlow: BookingFlow.instant_payment })).toBe(true));
  it('b2b_quote → false (Making Class / 꿈길 / 워크샵 — B2B inquiry → admin quote §5.8-A③)', () =>
    expect(isPackageBookableOnline({ bookingFlow: BookingFlow.b2b_quote })).toBe(false));
  it('gate reads bookingFlow, not the package name (renaming must not re-open web booking)', () => {
    const gridNamedB2b: Package = {
      ...base,
      languagesAvailable: [],
      name: 'Gold', // grid-tier name on purpose — the name must not matter
      bookingFlow: BookingFlow.b2b_quote,
    };
    expect(isPackageBookableOnline(gridNamedB2b)).toBe(false);
  });
});
