import { prisma } from '@/lib/db/prisma';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PACKAGES, seedPackages } from '../../prisma/seed-packages';
import { getPackageBySlug, listPackages } from './queries';

// Single file owns the `packages` table so no other Vitest worker races it (see plan note).
beforeEach(async () => {
  await prisma.package.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('seedPackages', () => {
  it('seeds all 8 packages', async () => {
    await seedPackages();
    expect(await prisma.package.count()).toBe(8);
    expect(PACKAGES).toHaveLength(8);
  });
  it('is idempotent (run twice → still 8)', async () => {
    await seedPackages();
    await seedPackages();
    expect(await prisma.package.count()).toBe(8);
  });
  it('seeds Diamond with exact PRD 5.2 values', async () => {
    await seedPackages();
    const d = await prisma.package.findUniqueOrThrow({ where: { slug: 'diamond' } });
    expect(d).toMatchObject({
      category: 'experience',
      basePriceKrw: 500_000,
      pricingMode: 'per_person_x1_5',
      slotMinutes: 120,
      headcountMin: 1,
      headcountMax: 5,
      bookingFlow: 'instant_payment',
      friendReferralEligible: true,
    });
    expect([...d.languagesAvailable].sort()).toEqual(['en', 'ja', 'ko', 'zh_HK', 'zh_TW']);
  });
  it('ko-only packages (rental + 꿈길 + 워크샵) have only ko', async () => {
    await seedPackages();
    for (const slug of ['1hour', '1pro', 'dreampath', 'workshop']) {
      const p = await prisma.package.findUniqueOrThrow({ where: { slug } });
      expect(p.languagesAvailable).toEqual(['ko']);
    }
  });
});

describe('catalog queries', () => {
  beforeEach(async () => {
    await seedPackages(); // runs after the outer deleteMany → clean + seeded
  });

  describe('listPackages — locale filter (§5/C11)', () => {
    it('ko site sees all 8', async () => {
      expect(await listPackages({ locale: 'ko' })).toHaveLength(8);
    });
    it('en site excludes rental + dreampath + workshop (ko-only)', async () => {
      const slugs = (await listPackages({ locale: 'en' })).map((p) => p.slug);
      expect(slugs).toEqual(['gold', 'diamond', 'premium', 'making-class']); // displayOrder order
    });
  });

  describe('listPackages — category + active + order', () => {
    it('filters by category, ordered by displayOrder', async () => {
      const slugs = (await listPackages({ category: 'experience', locale: 'ko' })).map(
        (p) => p.slug,
      );
      expect(slugs).toEqual(['gold', 'diamond', 'premium']);
    });
    it('excludes inactive when activeOnly (default)', async () => {
      await prisma.package.update({ where: { slug: 'gold' }, data: { isActive: false } });
      const slugs = (await listPackages({ category: 'experience', locale: 'ko' })).map(
        (p) => p.slug,
      );
      expect(slugs).toEqual(['diamond', 'premium']);
    });
    it('includes inactive when activeOnly=false', async () => {
      await prisma.package.update({ where: { slug: 'gold' }, data: { isActive: false } });
      expect(
        await listPackages({ category: 'experience', locale: 'ko', activeOnly: false }),
      ).toHaveLength(3);
    });
  });

  describe('getPackageBySlug', () => {
    it('returns the package or null', async () => {
      expect((await getPackageBySlug('premium'))?.basePriceKrw).toBe(1_500_000);
      expect(await getPackageBySlug('nope')).toBeNull();
    });
  });
});
