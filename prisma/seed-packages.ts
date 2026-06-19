import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/db/prisma';

const ALL: Prisma.PackageCreateInput['languagesAvailable'] = ['ko', 'en', 'ja', 'zh_TW', 'zh_HK'];
const KO: Prisma.PackageCreateInput['languagesAvailable'] = ['ko'];

// PRD §5.2 / §6 exact. displayOrder is global 1..8 in listed order.
// Gold capacity is 1~2 per its 인원 row (the 3–5인 cells in the PRD price table are a
// uniform-table artifact); Diamond/Premium are 1~5.
export const PACKAGES: Prisma.PackageCreateInput[] = [
  {
    slug: 'gold',
    category: 'experience',
    name: 'Gold',
    basePriceKrw: 400_000,
    pricingMode: 'per_person_x1_5',
    slotMinutes: 120,
    headcountMin: 1,
    headcountMax: 2,
    languagesAvailable: ALL,
    bookingFlow: 'instant_payment',
    friendReferralEligible: false,
    displayOrder: 1,
  },
  {
    slug: 'diamond',
    category: 'experience',
    name: 'Diamond',
    basePriceKrw: 500_000,
    pricingMode: 'per_person_x1_5',
    slotMinutes: 120,
    headcountMin: 1,
    headcountMax: 5,
    languagesAvailable: ALL,
    bookingFlow: 'instant_payment',
    friendReferralEligible: true,
    displayOrder: 2,
  },
  {
    slug: 'premium',
    category: 'experience',
    name: 'Premium',
    basePriceKrw: 1_500_000,
    pricingMode: 'per_person_x1_5',
    slotMinutes: 180,
    headcountMin: 1,
    headcountMax: 5,
    languagesAvailable: ALL,
    bookingFlow: 'instant_payment',
    friendReferralEligible: true,
    displayOrder: 3,
  },
  {
    slug: '1hour',
    category: 'rental',
    name: '1Hour',
    basePriceKrw: 100_000,
    pricingMode: 'flat',
    slotMinutes: 60,
    headcountMin: 1,
    headcountMax: 5,
    languagesAvailable: KO,
    bookingFlow: 'instant_payment',
    friendReferralEligible: false,
    displayOrder: 4,
  },
  {
    slug: '1pro',
    category: 'rental',
    name: '1Pro',
    basePriceKrw: 300_000,
    pricingMode: 'flat',
    slotMinutes: 210,
    headcountMin: 1,
    headcountMax: 5,
    languagesAvailable: KO,
    bookingFlow: 'instant_payment',
    friendReferralEligible: false,
    displayOrder: 5,
  },
  {
    slug: 'making-class',
    category: 'group',
    name: 'K-Pop Making Class',
    basePriceKrw: 150_000,
    pricingMode: 'per_head',
    slotMinutes: 120,
    headcountMin: 2,
    headcountMax: 15,
    languagesAvailable: ALL,
    bookingFlow: 'instant_payment',
    friendReferralEligible: true,
    displayOrder: 6,
  },
  {
    slug: 'dreampath',
    category: 'group',
    name: '꿈길',
    basePriceKrw: 30_000,
    pricingMode: 'per_head',
    slotMinutes: 120,
    headcountMin: 10,
    headcountMax: 15,
    languagesAvailable: KO,
    bookingFlow: 'b2b_quote',
    friendReferralEligible: true,
    displayOrder: 7,
  },
  {
    slug: 'workshop',
    category: 'group',
    name: '워크샵',
    basePriceKrw: 50_000,
    pricingMode: 'per_head',
    slotMinutes: 120,
    headcountMin: 5,
    headcountMax: 15,
    languagesAvailable: KO,
    bookingFlow: 'b2b_quote',
    friendReferralEligible: true,
    displayOrder: 8,
  },
];

export async function seedPackages() {
  for (const p of PACKAGES) {
    await prisma.package.upsert({ where: { slug: p.slug }, update: p, create: p });
  }
}

// Run only when executed directly (`tsx prisma/seed-packages.ts`), not when imported by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedPackages()
    .then(() => console.log(`Seeded ${PACKAGES.length} packages.`))
    .finally(() => prisma.$disconnect());
}
