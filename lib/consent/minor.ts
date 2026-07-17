// Minor determination (PRD §3.4 / §5.7). "만 16세 미만" — the most conservative of KR/US(COPPA
// 13)/EU(GDPR 13–16)/JP(15). Reference point = the booking session date (the day the participant
// uses the service), compared against date of birth. PURE (no prisma, no Date.now) → unit-testable
// and identical on server (confirmBooking re-check, Stage D) and client (Step 3 UI gate).
//
// NOTE: this is the UX/validation copy of the rule. The AUTHORITATIVE block ("보호자 동의 없이는
// 결제 차단", CLAUDE.md 하드제약 #4) is enforced server-side at confirmBooking (Stage D); the client
// gate here must never be the only guard.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const MINOR_AGE_THRESHOLD = 16;

export class InvalidBirthDateError extends Error {
  constructor(value: string) {
    super(`date of birth must be "YYYY-MM-DD", got: ${JSON.stringify(value)}`);
    this.name = 'InvalidBirthDateError';
  }
}

// Full years elapsed from dob to refDate (calendar age). Both are "YYYY-MM-DD" KST wall dates.
export function ageOn(dob: string, refDate: string): number {
  if (!DATE_RE.test(dob)) throw new InvalidBirthDateError(dob);
  if (!DATE_RE.test(refDate)) throw new InvalidBirthDateError(refDate);
  const [by, bm, bd] = dob.split('-').map(Number);
  const [ry, rm, rd] = refDate.split('-').map(Number);
  let age = ry - by;
  // Not yet had this year's birthday on refDate → subtract one.
  if (rm < bm || (rm === bm && rd < bd)) age -= 1;
  return age;
}

// True when the participant is under 16 on the booking date → guardian consent required.
export function isMinorAtDate(dob: string, bookingDate: string): boolean {
  return ageOn(dob, bookingDate) < MINOR_AGE_THRESHOLD;
}

// Any participant under 16 → the booking triggers the guardian-consent branch.
export function hasMinorParticipant(dobs: string[], bookingDate: string): boolean {
  return dobs.some((d) => isMinorAtDate(d, bookingDate));
}
