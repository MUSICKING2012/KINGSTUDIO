# M2 Package Catalog (Data Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed the 8 bookable packages and expose them as a locale-filtered catalog with a money-critical, fully-tested pricing calculator — no UI, no schema migration.

**Architecture:** Reuse the existing `Package` Prisma model unchanged. Four units: a pure pricing calculator (`lib/catalog/pricing.ts`), a DB read layer (`lib/catalog/queries.ts`), an idempotent seed (`prisma/seed-packages.ts`), and en/ko-filled package message keys across all 5 locales. The pricing test passing is the slice's completion gate.

**Tech Stack:** Next.js 14, TypeScript, Prisma 6 (Postgres 16, local DB already migrated), Vitest, Biome, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-19-m2-package-catalog-design.md`

**Preconditions:** On branch `feat/m2-package-catalog`. Local Postgres running. `Package` model + `PackageCategory`/`PricingMode`/`BookingFlow`/`Locale` enums already exist (NO migration).

**Conventions:**
- TDD: failing test → run-fail → implement → run-pass → commit.
- **No schema migration.** If a schema change appears needed, STOP and ask (§7-A.5).
- Format before every commit: `pnpm exec biome check --write <files>` (avoids a trailing format pass).
- Explicit `git add <paths>` — never `git add -A`/`.`.
- Append to every commit message: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Prisma enum member names in TS: locales are `ko, en, ja, zh_TW, zh_HK` (stored as `zh-TW`/`zh-HK`).

## File Structure

| File | Responsibility |
|---|---|
| `lib/catalog/pricing.ts` | `computePackageTotal(pkg, headcount)` — pure pricing (gate) |
| `lib/catalog/queries.ts` | `listPackages`, `getPackageBySlug` — DB read with locale/category/active filters |
| `prisma/seed-packages.ts` | `PACKAGES` data + `seedPackages()` (idempotent) + direct-run CLI guard |
| `messages/{en,ko,ja,zh-TW,zh-HK}.json` | `packages.<slug>.name` + `.tagline` (en/ko filled, others interim) |
| `package.json` | add `seed:packages` script |

---

> **Test isolation (no Task 0 needed).** The seed and queries tests both touch the global `packages` table. To avoid a cross-worker race under Vitest's default file-parallelism — WITHOUT serializing all files (which exposed latent flakiness in the existing admin/customer tests via their per-file `prisma.$disconnect()`) — put BOTH the seed tests and the queries tests in a **single file** `lib/catalog/catalog.test.ts`. No other test file touches `packages`, so one worker owns it and tests run sequentially within. No `vitest.config.ts` change.

## Task 1: Pricing calculator (the money-critical gate)

**Files:** Create `lib/catalog/pricing.ts`; Test `lib/catalog/pricing.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/catalog/pricing.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { computePackageTotal } from './pricing';

// Minimal package inputs (only the fields pricing reads).
const experience = (basePriceKrw: number, headcountMax: number) =>
  ({ basePriceKrw, pricingMode: 'per_person_x1_5' as const, headcountMin: 1, headcountMax });
const gold = experience(400_000, 2);
const diamond = experience(500_000, 5);
const premium = experience(1_500_000, 5);
const oneHour = { basePriceKrw: 100_000, pricingMode: 'flat' as const, headcountMin: 1, headcountMax: 5 };
const onePro = { basePriceKrw: 300_000, pricingMode: 'flat' as const, headcountMin: 1, headcountMax: 5 };
const makingClass = { basePriceKrw: 150_000, pricingMode: 'per_head' as const, headcountMin: 2, headcountMax: 15 };
const dreampath = { basePriceKrw: 30_000, pricingMode: 'per_head' as const, headcountMin: 10, headcountMax: 15 };

describe('computePackageTotal — experience per-head +50% multiplier', () => {
  it('applies multiplier 1.0/1.5/2.0/2.5/3.0 for headcount 1..5', () => {
    const mults = [1, 2, 3, 4, 5].map((n) => computePackageTotal(diamond, n).basis.multiplier);
    expect(mults).toEqual([1.0, 1.5, 2.0, 2.5, 3.0]);
  });
  it('Diamond representative KRW values', () => {
    expect([1, 2, 3, 4, 5].map((n) => computePackageTotal(diamond, n).totalKrw))
      .toEqual([500_000, 750_000, 1_000_000, 1_250_000, 1_500_000]);
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
```

- [ ] **Step 2: Run → FAIL.** `pnpm test lib/catalog/pricing.test.ts` (computePackageTotal not defined).

- [ ] **Step 3: Implementation**

`lib/catalog/pricing.ts`:
```ts
import type { Package, PricingMode } from '@prisma/client';

// Only the fields pricing needs — keeps the calculator pure and trivially testable.
export type PricingInput = Pick<Package, 'basePriceKrw' | 'pricingMode' | 'headcountMin' | 'headcountMax'>;

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
  if (!Number.isInteger(headcount) || headcount < pkg.headcountMin || headcount > pkg.headcountMax) {
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
      return { unitPriceKrw: base, totalKrw: computedTotal, basis: { mode: pkg.pricingMode, base, headcount, multiplier, computedTotal } };
    }
    case 'flat':
      return { unitPriceKrw: base, totalKrw: base, basis: { mode: pkg.pricingMode, base, headcount, computedTotal: base } };
    case 'per_head': {
      const computedTotal = base * headcount;
      return { unitPriceKrw: base, totalKrw: computedTotal, basis: { mode: pkg.pricingMode, base, headcount, computedTotal } };
    }
  }
}
```

- [ ] **Step 4: Run → PASS.** `pnpm test lib/catalog/pricing.test.ts` (all green).

- [ ] **Step 5: Format + commit**
```bash
pnpm exec biome check --write lib/catalog/pricing.ts lib/catalog/pricing.test.ts
git add lib/catalog/pricing.ts lib/catalog/pricing.test.ts
git commit -m "feat(catalog): package pricing calculator (per-head +50%, flat, per-head; fail-safe)"
```

---

## Task 2: Package seed (8 packages, idempotent)

**Files:** Create `prisma/seed-packages.ts`; Test `prisma/seed-packages.test.ts`; Modify `package.json`

- [ ] **Step 1: Write the failing test**

`prisma/seed-packages.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { PACKAGES, seedPackages } from './seed-packages';

beforeEach(async () => {
  // bookings reference packages; none exist in this slice, so a clean wipe is safe here.
  await prisma.package.deleteMany();
});
afterAll(async () => { await prisma.$disconnect(); });

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
      category: 'experience', basePriceKrw: 500_000, pricingMode: 'per_person_x1_5',
      slotMinutes: 120, headcountMin: 1, headcountMax: 5, bookingFlow: 'instant_payment',
      friendReferralEligible: true,
    });
    expect(d.languagesAvailable.sort()).toEqual(['en', 'ja', 'ko', 'zh_HK', 'zh_TW']);
  });
  it('ko-only packages have only ko', async () => {
    await seedPackages();
    for (const slug of ['1hour', '1pro', 'dreampath', 'workshop']) {
      const p = await prisma.package.findUniqueOrThrow({ where: { slug } });
      expect(p.languagesAvailable).toEqual(['ko']);
    }
  });
});
```

- [ ] **Step 2: Run → FAIL.** `pnpm test prisma/seed-packages.test.ts`

- [ ] **Step 3: Implementation**

`prisma/seed-packages.ts`:
```ts
import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/db/prisma';

const ALL: Prisma.PackageCreateInput['languagesAvailable'] = ['ko', 'en', 'ja', 'zh_TW', 'zh_HK'];
const KO: Prisma.PackageCreateInput['languagesAvailable'] = ['ko'];

// PRD §5.2 / §6 exact. displayOrder is global 1..8 in listed order.
export const PACKAGES: Prisma.PackageCreateInput[] = [
  { slug: 'gold', category: 'experience', name: 'Gold', basePriceKrw: 400_000, pricingMode: 'per_person_x1_5', slotMinutes: 120, headcountMin: 1, headcountMax: 2, languagesAvailable: ALL, bookingFlow: 'instant_payment', friendReferralEligible: false, displayOrder: 1 },
  { slug: 'diamond', category: 'experience', name: 'Diamond', basePriceKrw: 500_000, pricingMode: 'per_person_x1_5', slotMinutes: 120, headcountMin: 1, headcountMax: 5, languagesAvailable: ALL, bookingFlow: 'instant_payment', friendReferralEligible: true, displayOrder: 2 },
  { slug: 'premium', category: 'experience', name: 'Premium', basePriceKrw: 1_500_000, pricingMode: 'per_person_x1_5', slotMinutes: 180, headcountMin: 1, headcountMax: 5, languagesAvailable: ALL, bookingFlow: 'instant_payment', friendReferralEligible: true, displayOrder: 3 },
  { slug: '1hour', category: 'rental', name: '1Hour', basePriceKrw: 100_000, pricingMode: 'flat', slotMinutes: 60, headcountMin: 1, headcountMax: 5, languagesAvailable: KO, bookingFlow: 'instant_payment', friendReferralEligible: false, displayOrder: 4 },
  { slug: '1pro', category: 'rental', name: '1Pro', basePriceKrw: 300_000, pricingMode: 'flat', slotMinutes: 210, headcountMin: 1, headcountMax: 5, languagesAvailable: KO, bookingFlow: 'instant_payment', friendReferralEligible: false, displayOrder: 5 },
  { slug: 'making-class', category: 'group', name: 'K-Pop Making Class', basePriceKrw: 150_000, pricingMode: 'per_head', slotMinutes: 120, headcountMin: 2, headcountMax: 15, languagesAvailable: ALL, bookingFlow: 'instant_payment', friendReferralEligible: true, displayOrder: 6 },
  { slug: 'dreampath', category: 'group', name: '꿈길', basePriceKrw: 30_000, pricingMode: 'per_head', slotMinutes: 120, headcountMin: 10, headcountMax: 15, languagesAvailable: KO, bookingFlow: 'b2b_quote', friendReferralEligible: true, displayOrder: 7 },
  { slug: 'workshop', category: 'group', name: '워크샵', basePriceKrw: 50_000, pricingMode: 'per_head', slotMinutes: 120, headcountMin: 5, headcountMax: 15, languagesAvailable: KO, bookingFlow: 'b2b_quote', friendReferralEligible: true, displayOrder: 8 },
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
```

Add to `package.json` scripts (after `seed:admin`): `"seed:packages": "tsx prisma/seed-packages.ts",`

- [ ] **Step 4: Run → PASS.** `pnpm test prisma/seed-packages.test.ts`. Then run the CLI once to populate the dev DB: `pnpm seed:packages` (expect "Seeded 8 packages.").

- [ ] **Step 5: Format + commit**
```bash
pnpm exec biome check --write prisma/seed-packages.ts prisma/seed-packages.test.ts package.json
git add prisma/seed-packages.ts prisma/seed-packages.test.ts package.json
git commit -m "feat(catalog): seed 8 packages (PRD 5.2/§6 exact, idempotent)"
```

---

## Task 3: Catalog read layer

**Files:** Create `lib/catalog/queries.ts`; Test `lib/catalog/queries.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/catalog/queries.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { seedPackages } from '../../prisma/seed-packages';
import { getPackageBySlug, listPackages } from './queries';

beforeEach(async () => {
  await prisma.package.deleteMany();
  await seedPackages();
});
afterAll(async () => { await prisma.$disconnect(); });

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
    const slugs = (await listPackages({ category: 'experience', locale: 'ko' })).map((p) => p.slug);
    expect(slugs).toEqual(['gold', 'diamond', 'premium']);
  });
  it('excludes inactive when activeOnly (default)', async () => {
    await prisma.package.update({ where: { slug: 'gold' }, data: { isActive: false } });
    const slugs = (await listPackages({ category: 'experience', locale: 'ko' })).map((p) => p.slug);
    expect(slugs).toEqual(['diamond', 'premium']);
  });
  it('includes inactive when activeOnly=false', async () => {
    await prisma.package.update({ where: { slug: 'gold' }, data: { isActive: false } });
    expect(await listPackages({ category: 'experience', locale: 'ko', activeOnly: false })).toHaveLength(3);
  });
});

describe('getPackageBySlug', () => {
  it('returns the package or null', async () => {
    expect((await getPackageBySlug('premium'))?.basePriceKrw).toBe(1_500_000);
    expect(await getPackageBySlug('nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Run → FAIL.** `pnpm test lib/catalog/queries.test.ts`

- [ ] **Step 3: Implementation**

`lib/catalog/queries.ts`:
```ts
import type { Locale, Package, PackageCategory } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

// Catalog read layer. Locale filter is the §5/C11 rule: a package shows on a locale's site
// only if that locale ∈ languagesAvailable (so ko-only rental/꿈길/워크샵 auto-hide abroad).
export async function listPackages(opts: {
  category?: PackageCategory;
  locale: Locale;
  activeOnly?: boolean;
}): Promise<Package[]> {
  const { category, locale, activeOnly = true } = opts;
  return prisma.package.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(category ? { category } : {}),
      languagesAvailable: { has: locale },
    },
    orderBy: { displayOrder: 'asc' },
  });
}

// No locale filter — slug routing. A locale-gated detail page checks languagesAvailable itself.
export async function getPackageBySlug(slug: string): Promise<Package | null> {
  return prisma.package.findUnique({ where: { slug } });
}
```

- [ ] **Step 4: Run → PASS.** `pnpm test lib/catalog/queries.test.ts`

- [ ] **Step 5: Format + commit**
```bash
pnpm exec biome check --write lib/catalog/queries.ts lib/catalog/queries.test.ts
git add lib/catalog/queries.ts lib/catalog/queries.test.ts
git commit -m "feat(catalog): package read layer (locale/category/active filter)"
```

---

## Task 4: Package message keys (5 locales)

**Files:** Modify `messages/en.json`, `messages/ko.json`, `messages/ja.json`, `messages/zh-TW.json`, `messages/zh-HK.json`

> `scripts/check-i18n-keys.ts` enforces exact key parity across all 5 locales, so the same `packages.*` keys must exist in every file. en/ko are filled; ja/zh-TW/zh-HK get the en text as interim (machine-translation + review later, §5).

- [ ] **Step 1: Add the `packages` block to `messages/en.json`** (English) — insert as a new top-level key:

```json
"packages": {
  "gold": { "name": "Gold", "tagline": "K-POP vocal training, entry level" },
  "diamond": { "name": "Diamond", "tagline": "A full K-POP recording experience" },
  "premium": { "name": "Premium", "tagline": "Recording plus a full music-video package" },
  "1hour": { "name": "1Hour", "tagline": "Studio hourly rental with an engineer" },
  "1pro": { "name": "1Pro", "tagline": "Studio rental for serious recording" },
  "making-class": { "name": "K-Pop Making Class", "tagline": "A group K-pop making class" },
  "dreampath": { "name": "Dreampath", "tagline": "A group program" },
  "workshop": { "name": "Workshop", "tagline": "A group workshop program" }
}
```

- [ ] **Step 2: Add the same block to `messages/ko.json`** (Korean):

```json
"packages": {
  "gold": { "name": "Gold", "tagline": "K-POP 보컬 트레이닝 입문" },
  "diamond": { "name": "Diamond", "tagline": "본격 K-POP 녹음 체험" },
  "premium": { "name": "Premium", "tagline": "녹음 + 뮤직비디오 풀패키지" },
  "1hour": { "name": "1Hour", "tagline": "스튜디오 시간 대여 + 엔지니어" },
  "1pro": { "name": "1Pro", "tagline": "본격 녹음용 스튜디오 대여" },
  "making-class": { "name": "K-Pop Making Class", "tagline": "단체 K-POP 메이킹 클래스" },
  "dreampath": { "name": "꿈길", "tagline": "단체 프로그램" },
  "workshop": { "name": "워크샵", "tagline": "단체 워크샵 프로그램" }
}
```

- [ ] **Step 3: Add the EN block verbatim to `messages/ja.json`, `messages/zh-TW.json`, `messages/zh-HK.json`** (interim — identical to the en block from Step 1, so key parity holds and copy is translated later).

- [ ] **Step 4: Verify parity + build**

Run: `pnpm i18n:check` → expect no missing/extra keys. Then `pnpm exec tsc --noEmit` (sanity).
Expected: i18n:check prints success / exits 0.

- [ ] **Step 5: Commit**
```bash
git add messages/en.json messages/ko.json messages/ja.json messages/zh-TW.json messages/zh-HK.json
git commit -m "feat(catalog): package name/tagline message keys (en/ko filled, others interim)"
```

---

## Final: full verification

- [ ] `pnpm test` — all suites green (pricing gate + seed + queries + existing customer/admin).
- [ ] `pnpm lint` — clean (run `pnpm lint:fix` first if needed).
- [ ] `pnpm exec tsc --noEmit` — no errors.
- [ ] `pnpm i18n:check` — parity holds.
- [ ] `pnpm build` — compiles.
- [ ] Confirm the **pricing gate**: `pnpm test lib/catalog/pricing.test.ts` green (the slice's completion criterion).

## Post-slice tracking (from spec §9 — do NOT lose)

1. **Doc sync — C10 extension: ✅ DONE (2026-06-19).** PRD §5.2 (1–5인 price rows + C10 note), CLAUDE §6, and the pricing-model xlsx all carry `base × (1 + 0.5(n−1))`. Docs and code agree. (Note: PRD §5.2 shows Gold 3–5인 price cells as a uniform-table artifact; Gold capacity stays 1~2명 per its 인원 row → seed Gold headcountMax=2.)
2. Deferred to later slices: deliverables matrix, non-en/ko copy, admin catalog CMS UI, customer `/packages` pages, song catalog slice.
