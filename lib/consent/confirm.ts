// AUTHORITATIVE server-side booking-consent gate (Stage D). This is the un-bypassable enforcement of
// 하드제약 #4 (미성년자 보호자 동의 없이는 결제 차단) and the required-consent rule (§5.5/§5.7).
// PURE (no prisma, no Date.now) so it is unit-testable in the cloud harness AND callable verbatim
// inside the confirmBooking transaction — the client Step 3/4 gate is UX only and is NEVER trusted.
//
// Key property: `hasMinor` and each participant's minor status are RE-COMPUTED here from the raw
// dates-of-birth + booking date via lib/consent/minor. The client-sent `hasMinor` is ignored entirely
// — a bypasser cannot flip it to skip the guardian branch. The booking date is the service date the
// participant actually uses the service (isMinorAtDate reference point).
//
// Required consents at confirm = Step 3 set (requiredConsentTypes) PLUS the pre-payment `payment`
// consent collected on Step 4 (§5.5 결제 직전 동의 화면: 결제약관·환불규정). Marketing consents are
// optional and never gate. `payment` covers the combined payment-terms + refund-policy checkbox
// (schema has one `payment` ConsentType; the refund policy itself is separately frozen in
// Booking.refundPolicySnapshot). A dedicated refund ConsentType is a possible later split if legal
// wants the two agreements recorded independently.

import { isMinorAtDate } from './minor';
import {
  type ConsentType,
  type GuardianInfo,
  type PackageCategory,
  requiredConsentTypes,
} from './step3';

// The Step-4-only required consent on top of the Step-3 set.
export const PREPAYMENT_REQUIRED_CONSENTS: ConsentType[] = ['payment'];

export type ConfirmConsentInput = {
  category: PackageCategory;
  participantDobs: string[]; // one per participant (headcount entries), "YYYY-MM-DD"
  bookingDate: string; // "YYYY-MM-DD" KST service date
  checkedConsents: ConsentType[]; // everything the caller claims is agreed (incl. marketing/payment)
  guardian?: GuardianInfo | null;
};

export type ConfirmConsentReason =
  | 'dob_invalid'
  | 'consent_missing'
  | 'minor_guardian_required'
  | 'guardian_incomplete';

export type ConfirmConsentResult = {
  ok: boolean;
  hasMinor: boolean; // server-recomputed
  participantIsMinor: boolean[]; // server-recomputed, positional to participantDobs → BookingParticipant.isMinor snapshot
  missingConsents: ConsentType[];
  reasons: ConfirmConsentReason[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function guardianComplete(g: GuardianInfo | null | undefined): boolean {
  return Boolean(g?.name.trim() && g?.relation.trim() && g?.contact.trim() && g?.email.trim());
}

// The full required-consent set for a confirm: Step 3 required + Step 4 payment.
export function requiredConfirmConsents(
  category: PackageCategory,
  hasMinor: boolean,
): ConsentType[] {
  return [...requiredConsentTypes(category, hasMinor), ...PREPAYMENT_REQUIRED_CONSENTS];
}

// Recomputes minor status server-side and validates the complete required-consent set. Never throws
// on business-rule failure — returns ok:false with machine reasons so confirmBooking maps them to
// typed errors and the route to auto-refund/4xx. Throws only on structurally invalid DOB input.
export function validateBookingConsents(input: ConfirmConsentInput): ConfirmConsentResult {
  const reasons: ConfirmConsentReason[] = [];

  // 1) Structural DOB validation + server-side minor recomputation (client hasMinor is ignored).
  const dobs = input.participantDobs;
  const dobsValid =
    dobs.length > 0 && dobs.every((d) => DATE_RE.test(d) && DATE_RE.test(input.bookingDate));
  if (!dobsValid) {
    // Cannot compute minor status → hard fail. Empty/malformed = never let it proceed.
    return {
      ok: false,
      hasMinor: false,
      participantIsMinor: dobs.map(() => false),
      missingConsents: [],
      reasons: ['dob_invalid'],
    };
  }

  const participantIsMinor = dobs.map((d) => isMinorAtDate(d, input.bookingDate));
  const hasMinor = participantIsMinor.some(Boolean);

  // 2) Required consent completeness (Step 3 + payment), computed against the SERVER hasMinor.
  const checked = new Set(input.checkedConsents);
  const required = requiredConfirmConsents(input.category, hasMinor);
  const missingConsents = required.filter((c) => !checked.has(c));
  if (missingConsents.length > 0) reasons.push('consent_missing');

  // 3) Minor branch: guardian consent MUST be checked (the 'guardian' type is already required above
  //    when hasMinor) AND guardian info complete. Split reasons so the caller/UI can distinguish
  //    "no guardian consent at all" (the 하드제약 #4 block) from "info incomplete".
  if (hasMinor) {
    if (!checked.has('guardian')) reasons.push('minor_guardian_required');
    if (!guardianComplete(input.guardian)) reasons.push('guardian_incomplete');
  }

  return {
    ok: reasons.length === 0,
    hasMinor,
    participantIsMinor,
    missingConsents,
    reasons,
  };
}
