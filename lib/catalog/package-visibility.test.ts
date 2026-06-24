import { describe, it, expect } from 'vitest';
import { isPackageViewable } from './package-visibility';

const base = {
  id: 'x', slug: 'gold', category: 'experience', name: 'Gold',
  basePriceKrw: 400000, pricingMode: 'per_person_x1_5', slotMinutes: 120,
  headcountMin: 1, headcountMax: 2, bookingFlow: 'instant_payment',
  friendReferralEligible: false, isActive: true, displayOrder: 0,
  createdAt: new Date(), updatedAt: new Date(),
} as any;

describe('isPackageViewable', () => {
  it('null → false', () => expect(isPackageViewable(null, 'ko' as any)).toBe(false));
  it('inactive → false', () =>
    expect(isPackageViewable({ ...base, isActive: false, languagesAvailable: ['ko'] }, 'ko' as any)).toBe(false));
  it('ko-only package on en → false', () =>
    expect(isPackageViewable({ ...base, languagesAvailable: ['ko'] }, 'en' as any)).toBe(false));
  it('all-locale package on en → true', () =>
    expect(isPackageViewable({ ...base, languagesAvailable: ['ko','en','ja','zh_TW','zh_HK'] }, 'en' as any)).toBe(true));
});
