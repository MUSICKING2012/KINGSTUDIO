import type { Package } from '@prisma/client';
import { BookingFlow, Locale, PackageCategory, PricingMode } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { isPackageViewable } from './package-visibility';

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
          languagesAvailable: [Locale.ko, Locale.en, Locale.ja, Locale.zh_TW, Locale.zh_HK],
        },
        Locale.en,
      ),
    ).toBe(true));
});
