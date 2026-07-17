// 💰 Money-critical (§4 danger zone — price calc). Pure discount-resolution layer that sits ON TOP
// of computePackageTotal (./pricing). Given the headcount subtotal (the pre-discount charged total)
// and which self-acquired discounts a booking qualifies for, it decides the SINGLE discount that
// applies and the final total.
//
// Product rules (Reconciliation §7 / CLAUDE.md §6 / PRD §5.9):
//   • Customer self-acquired discount channels = returning-member + friend-referral ONLY. Promotion
//     codes are an admin marketing instrument, NOT a self-acquired channel → not modelled here.
//   • Every discount is 10% of the headcount total, capped at ₩50,000.
//   • Mutually exclusive: AT MOST ONE discount applies — the most favourable amount. On a tie
//     (equal amounts — the common case, since both are 10%-of-the-same-subtotal capped), RETURNING
//     wins (owner rule: don't burn the customer's held referral/coupon when a no-cost returning
//     discount is equal).
//   • Indefinite validity; auto-applied at checkout (no code entry).
//
// Scope / eligibility is resolved by the CALLER (needs DB), not here — this module is pure so the
// money math is trivially unit-testable:
//   • returning: Package.returningDiscountEligible (experience Gold/Diamond/Premium) AND the booker
//     is a logged-in member with ≥1 prior completed & paid (non-refunded) booking. The caller passes
//     the boolean.
//   • referral (invitee): Stage 6 wires the invite-tracking that produces the invitee amount; until
//     then callers leave `referralCandidateKrw` undefined/null and only the returning path can fire.
//     The resolver already handles the referral candidate correctly so Stage 6 only supplies data,
//     never changes this logic (structural hook).
//
// Snapshot mapping (§3.2 — frozen into the Booking at payment):
//   • returning chosen → amount goes to Booking.returningDiscountKrw (this module returns it).
//   • referral chosen  → amount goes to Referral.inviteeDiscountKrw (Stage 6; Booking.returning stays null).
//   • the `snapshot` object is merged into Booking.pricingSnapshot.discounts for audit.

export type DiscountType = 'returning' | 'referral';

export const DISCOUNT_RATE_PCT = 10; // §5.9 — 10%
export const DISCOUNT_CAP_KRW = 50_000; // §5.9 / Reconciliation §7 — ₩50,000 cap (owner-confirmed 2026-07-17)

function assertPositiveInt(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer (got ${value})`);
  }
}

// 10% of a KRW subtotal, floored to whole won, then capped. `Math.floor(subtotal / 10)` IS the exact
// integer floor of subtotal × 10% (no float step). Floor (not round) is the conservative money rule:
// never over-discount. ⚠️ Rounding direction is a money policy — flagged for Aiden's review.
export function computeTenPercentCapped(subtotalKrw: number): number {
  assertPositiveInt(subtotalKrw, 'subtotalKrw');
  return Math.min(DISCOUNT_CAP_KRW, Math.floor(subtotalKrw / 10));
}

export type DiscountResolutionInput = {
  // Headcount total BEFORE any discount (computePackageTotal(...).totalKrw). §5.9 discount basis.
  subtotalKrw: number;
  // Package.returningDiscountEligible AND member-with-prior-completed-paid (caller resolves via DB).
  returningEligible: boolean;
  // Stage 6 hook: the invitee referral discount amount if a valid referral applies to THIS booking.
  // undefined/null = no referral (current state). Re-clamped here defensively to [0, cap, subtotal].
  referralCandidateKrw?: number | null;
};

export type AppliedDiscount = { type: DiscountType; amountKrw: number };

export type DiscountResolution = {
  applied: AppliedDiscount | null; // the single winning discount, or null when none qualifies
  totalKrw: number; // subtotalKrw − applied amount (== subtotal when none)
  returningDiscountKrw: number | null; // → Booking.returningDiscountKrw (null unless returning won)
  // → merged into Booking.pricingSnapshot.discounts (§3.2 audit trail).
  snapshot: {
    subtotalKrw: number;
    candidates: AppliedDiscount[];
    applied: AppliedDiscount | null;
    rule: 'mutual_exclusive_max_one_returning_priority';
    ratePct: number;
    capKrw: number;
  };
};

// Resolves the at-most-one self-acquired discount for a booking (§7 mutual exclusion).
// Candidate order is significant: returning is listed FIRST and selection uses a strict `>` so an
// equal-amount referral never displaces it → ties resolve to returning (owner rule).
export function resolveDiscounts(input: DiscountResolutionInput): DiscountResolution {
  const { subtotalKrw, returningEligible, referralCandidateKrw } = input;
  assertPositiveInt(subtotalKrw, 'subtotalKrw');

  const candidates: AppliedDiscount[] = [];

  if (returningEligible) {
    candidates.push({ type: 'returning', amountKrw: computeTenPercentCapped(subtotalKrw) });
  }

  if (referralCandidateKrw != null) {
    if (!Number.isInteger(referralCandidateKrw) || referralCandidateKrw < 0) {
      throw new RangeError(
        `referralCandidateKrw must be a non-negative integer (got ${referralCandidateKrw})`,
      );
    }
    // Defensive clamp — the referral module (Stage 6) is the source of truth for its own amount, but
    // never let a stray value exceed the cap or the subtotal.
    const clamped = Math.min(referralCandidateKrw, DISCOUNT_CAP_KRW, subtotalKrw);
    if (clamped > 0) candidates.push({ type: 'referral', amountKrw: clamped });
  }

  let applied: AppliedDiscount | null = null;
  for (const candidate of candidates) {
    if (applied === null || candidate.amountKrw > applied.amountKrw) {
      applied = candidate;
    }
  }

  const totalKrw = subtotalKrw - (applied?.amountKrw ?? 0);
  // Invariant: cap (₩50,000) is far below any real experience subtotal, so total is always > 0.
  // Assert anyway — a mispriced package must fail loudly, never charge a negative/zero total.
  if (totalKrw < 0) {
    throw new RangeError(`discount ${applied?.amountKrw} exceeds subtotal ${subtotalKrw}`);
  }

  return {
    applied,
    totalKrw,
    returningDiscountKrw: applied?.type === 'returning' ? applied.amountKrw : null,
    snapshot: {
      subtotalKrw,
      candidates,
      applied,
      rule: 'mutual_exclusive_max_one_returning_priority',
      ratePct: DISCOUNT_RATE_PCT,
      capKrw: DISCOUNT_CAP_KRW,
    },
  };
}
