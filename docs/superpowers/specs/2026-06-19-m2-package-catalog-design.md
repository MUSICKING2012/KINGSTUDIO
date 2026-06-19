# M2 Slice 1 — Package Catalog (Data Foundation) Design

> Status: approved-pending-review · Date: 2026-06-19 · Milestone: M2 (예약·슬롯 엔진)
> First slice of M2. Read-side foundation; unblocks the slot-availability engine (needs `Package.slotMinutes`).

## Goal

Seed and expose the 8 bookable packages as a queryable, locale-filtered catalog with a tested pricing calculator — **no UI, no schema migration**. This is the data foundation the slot engine, booking flow, and (later) catalog pages build on.

## Confirmed scope decisions (brainstorming)

- **Q1 — package display copy = hybrid.** Structured "truth" fields (price, slot, headcount, languages, flow, active) stay on the existing DB `Package` model (admin-managed per CLAUDE §6). Marketing prose (concept, descriptions) lives in next-intl `messages` (git). Deliverables-comparison matrix (O2) is *deferred* to the catalog-pages UI slice (YAGNI — not needed by the data layer or slot engine).
- **Q2 — data foundation only.** Seed + read/pricing layer + en messages scaffolding. NO admin CMS UI, NO customer `/packages` pages (later M2 slices).
- **Q3 — songs are a separate slice.** This slice is packages only. Song/SongTranslation/SongLicense catalog (with preview + R2 licensing) is its own later M2 slice.
- **OPEN-1 resolved — experience 3–5 pricing.** `total = base × (1 + 0.5 × (headcount − 1))` — each head beyond the first adds 50% of base. Extends C10 (which only defined 1–2). Diamond max 5, Premium max 5, Gold max 2.
- **OPEN-2 resolved — rental headcount = 1–5**, flat price (headcount does not affect total).

## Architecture — Approach 1 (no schema change)

The existing `Package` model already fully defines a bookable product (`slug, category, name, basePriceKrw, pricingMode, slotMinutes, headcountMin/Max, languagesAvailable, bookingFlow, friendReferralEligible, isActive, displayOrder`). We reuse it unchanged. Four units:

| File | Responsibility |
|---|---|
| `lib/catalog/pricing.ts` | `computePackageTotal(pkg, headcount)` — pure pricing calculator (the money-critical, heavily-tested core) |
| `lib/catalog/queries.ts` | `listPackages({category?, locale, activeOnly})`, `getPackageBySlug(slug)` — read layer with locale/category/active filtering |
| `prisma/seed-packages.ts` | idempotent upsert of the 8 packages (exact PRD 5.2 / §6 values) |
| `messages/en.json` (extend) | `packages.<slug>` keys (display name, tagline) — en-first per §5 |

Rejected alternatives: Approach 2 (add `deliverables Json` now) — deferred per YAGNI; Approach 3 (full `PackageTranslation` DB CMS) — rejected in Q1 (hybrid chosen).

## Seed data (PRD §5.2 / §6 — exact)

| slug | category | basePriceKrw | pricingMode | slotMinutes | headcountMin–Max | languagesAvailable | bookingFlow | friendReferralEligible |
|---|---|---|---|---|---|---|---|---|
| `gold` | experience | 400000 | per_person_x1_5 | 120 | 1–2 | ko,en,ja,zh-TW,zh-HK | instant_payment | false |
| `diamond` | experience | 500000 | per_person_x1_5 | 120 | 1–5 | ko,en,ja,zh-TW,zh-HK | instant_payment | true |
| `premium` | experience | 1500000 | per_person_x1_5 | 180 | 1–5 | ko,en,ja,zh-TW,zh-HK | instant_payment | true |
| `1hour` | rental | 100000 | flat | 60 | 1–5 | ko | instant_payment | false |
| `1pro` | rental | 300000 | flat | 210 | 1–5 | ko | instant_payment | false |
| `making-class` | group | 150000 | per_head | 120 | 2–15 | ko,en,ja,zh-TW,zh-HK | instant_payment | true |
| `dreampath` | group | 30000 | per_head | 120 | 10–15 | ko | b2b_quote | true |
| `workshop` | group | 50000 | per_head | 120 | 5–15 | ko | b2b_quote | true |

Notes: `dreampath` = 꿈길, `workshop` = 워크샵 (slug ASCII; localized display name in messages). `name` (canonical/admin identifier) = "Gold", "Diamond", … , "K-Pop Making Class", "꿈길", "워크샵". `displayOrder` ascending within category as listed.

## Pricing rules — the tested core (`computePackageTotal`)

Input: a `Package` + `headcount`. Validates `headcountMin ≤ headcount ≤ headcountMax` (throws `RangeError` otherwise — fail-safe, no silent mis-charge). Returns `{ unitPriceKrw, totalKrw, basis }` where `basis` is a structured object reused later for `Booking.pricingSnapshot` (§3.2).

- **experience** (`per_person_x1_5`): `total = base × (1 + 0.5 × (headcount − 1))`. Integer KRW (base is whole 만원 units so the half-step is exact). `basis = { mode, base, headcount, multiplier: 1 + 0.5*(n-1), computedTotal }`.
- **rental** (`flat`): `total = base` (headcount validated but does not affect total). `basis = { mode, base, headcount, computedTotal: base }`.
- **group** (`per_head`): `total = base × headcount`. `basis = { mode, base, headcount, computedTotal }`.

`unitPriceKrw` returned = `base` (per-person list price) for all modes (display).

Worked values (must be asserted in tests):
- gold: 1→400,000 · 2→600,000 · (3 → RangeError)
- diamond: 1→500,000 · 2→750,000 · 3→1,000,000 · 4→1,250,000 · 5→1,500,000 · (6 → RangeError)
- premium: 1→1,500,000 · 2→2,250,000 · 5→4,500,000
- 1hour: 1→100,000 · 5→100,000 (flat)
- making-class: 2→300,000 · 15→2,250,000
- dreampath: 10→300,000 · 9 → RangeError

## Read layer (`lib/catalog/queries.ts`)

- `listPackages({ category?, locale, activeOnly = true })` → packages where `isActive` (if activeOnly) AND `category` (if given) AND `locale ∈ languagesAvailable`, ordered by `displayOrder`. Locale filter is the §5/C11 rule: rental + dreampath + workshop (`['ko']`) are auto-excluded from non-`ko` sites.
- `getPackageBySlug(slug)` → single package or null (no locale filter — slug routing; caller checks `languagesAvailable` if locale-gating a detail page later).

## Messages (en-first)

Add `packages.<slug>.name` and `packages.<slug>.tagline` (short one-line concept from PRD §5.2). **`scripts/check-i18n-keys.ts` enforces exact key parity across all 5 locales** (every locale must have the same key set as `en`), so the keys MUST be added to all 5 files: `en` filled (English), `ko` filled (Korean — names/taglines known from PRD), and `ja` / `zh-TW` / `zh-HK` interim-copied from `en` (machine-translation + Aiden review later, per §5 "en 먼저 채우고 나머지 순차"). `pnpm i18n:check` must stay green. Full deliverables copy = later slice.

## Testing

- **pricing.ts (mandatory, money-critical — this test passing is the slice's completion gate):** Pure unit tests, no DB. MUST cover:
  1. **Per-head multiplier table (experience):** headcount 1→2→3→4→5 yields multiplier `1.0 / 1.5 / 2.0 / 2.5 / 3.0` of `base` (assert each).
  2. **Representative KRW values:** Diamond 3인 = `1,000,000`; Premium 5인 = `4,500,000` (plus gold 2인 = 600,000, diamond 2인 = 750,000).
  3. **Boundaries:** headcount `> headcountMax` (e.g. diamond 6) → `RangeError`; headcount `0` (and any `< headcountMin`, e.g. dreampath 9) → `RangeError`.
  4. **Rental flat invariance:** 1hour/1pro headcount 1,2,3,4,5 all return `base` (100,000 / 300,000), unchanged.
  5. **Group multiplication:** making-class 2→300,000 and 15→2,250,000; dreampath 10→300,000.
- **queries.ts:** seed first, then assert locale filter (en site excludes rental/dreampath/workshop; ko site includes all), category filter, activeOnly, displayOrder.
- **seed:** idempotency (run twice → 8 rows), exact field values for a spot-checked package (diamond).

## Out of scope (deferred — do NOT build here)

Deliverables-comparison matrix fields; marketing prose beyond en name/tagline; non-en locale copy; admin catalog CMS UI; customer `/packages/[slug]` + category pages; song catalog; any booking/slot/payment logic.

## Risk / §4 notes

Not a §4 danger zone, but `computePackageTotal` is **money-critical** — a wrong multiplier is a financial defect. Hence mandatory exhaustive pricing tests with asserted KRW values. The `basis` output is the same structure the M3 booking will freeze into `pricingSnapshot` (§3.2), so getting it right here pays forward.

## §9 Tracking list (MUST NOT DROP)

1. **Doc sync — C10 extension.** The experience 3–5 linear rule (`base × (1 + 0.5(n−1))`) is a NEW pricing policy beyond PRD's "3인 이상 추후 확정". On spec approval, sync PRD §5.2 (C10), CLAUDE §6, and the pricing model xlsx. Until synced, code is ahead of docs.
2. **Deliverables matrix** (O2, PRD §5.6) — representation decided in the catalog-pages UI slice (Json vs typed fields).
3. **Non-en locale copy + deliverables prose** — filled progressively per §5 (en first).
4. **Admin catalog CMS** (price/active/order editing UI) — later M2 slice; prices are already DB-editable fields, CMS is just the UI.
5. **Song catalog slice** — Song + SongTranslation + SongLicense seed/read/preview + R2 license-display gate.
6. **`pricingMode` enum name** `per_person_x1_5` is now slightly misleading (it's +0.5·base per head, not a fixed ×1.5). Keep the schema value; the formula lives in `pricing.ts`. Optional rename in a future migration.
