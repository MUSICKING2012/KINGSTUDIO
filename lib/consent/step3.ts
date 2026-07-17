// Step 3 (options + consent) required-items resolver and completeness gate. PURE (no prisma) →
// unit-testable, and re-used verbatim by the server enforcement at confirmBooking (Stage D).
//
// Consent SoT: PRD §5.7 동의 항목 전체 구조. Required at booking (미체크 시 결제 불가): ① tos
// ② privacy ④ usage_scope, plus ⑤ korean_only + license_self_brought for rental (1Hour/1Pro,
// customer-brought MR). Conditional-required: guardian when any participant <16. Payment-terms +
// refund-policy consent are shown on the pre-payment screen (§5.5) = Step 4 (Stage D), NOT here.
// Marketing consents (channel-split) are OPTIONAL and never gate progression.
//
// ConsentType / PackageCategory are local string unions mirroring the Prisma enums (kept prisma-
// free for the cloud vitest harness — same pattern as lib/slots/constants.ts).

export type ConsentType =
  | 'tos'
  | 'privacy'
  | 'payment'
  | 'usage_scope'
  | 'korean_only'
  | 'guardian'
  | 'marketing_basic'
  | 'marketing_ads'
  | 'marketing_outdoor'
  | 'marketing_broadcast'
  | 'marketing_email'
  | 'marketing_sms'
  | 'license_self_brought';

export type PackageCategory = 'experience' | 'rental' | 'group';

// Guardian info required alongside the `guardian` consent (§5.7 조건부 필수).
export type GuardianInfo = {
  name: string;
  relation: string;
  contact: string;
  email: string;
};

export type Step3Input = {
  category: PackageCategory;
  // one date-of-birth per participant (headcount entries); all required (§5.7 전원 입력)
  participantDobs: string[];
  hasMinor: boolean; // derived from participantDobs via lib/consent/minor (caller passes result)
  reservantName: string;
  reservantEmail: string;
  // set of consent types the user has checked (true). Marketing/optional may or may not be present.
  checkedConsents: ConsentType[];
  guardian?: GuardianInfo | null;
};

export const OPTIONAL_MARKETING_CONSENTS: ConsentType[] = [
  'marketing_basic',
  'marketing_ads',
  'marketing_outdoor',
  'marketing_broadcast',
  'marketing_email',
  'marketing_sms',
];

// The consent types that MUST be checked to proceed, given package category + minor presence.
export function requiredConsentTypes(category: PackageCategory, hasMinor: boolean): ConsentType[] {
  const req: ConsentType[] = ['tos', 'privacy', 'usage_scope'];
  if (category === 'rental') req.push('korean_only', 'license_self_brought');
  if (hasMinor) req.push('guardian');
  return req;
}

function guardianComplete(g: GuardianInfo | null | undefined): boolean {
  return Boolean(g?.name.trim() && g?.relation.trim() && g?.contact.trim() && g?.email.trim());
}

export type Step3Validation = {
  ok: boolean;
  missingConsents: ConsentType[];
  errors: string[]; // machine codes: 'dob_missing' | 'reservant_missing' | 'guardian_incomplete'
};

// Completeness gate for Step 3. Returns machine codes (UI maps to localized copy). No side effects.
export function validateStep3(input: Step3Input): Step3Validation {
  const errors: string[] = [];

  const dobCount = input.participantDobs.filter((d) => d.trim().length > 0).length;
  if (dobCount < input.participantDobs.length || input.participantDobs.length === 0) {
    errors.push('dob_missing');
  }
  if (!input.reservantName.trim() || !input.reservantEmail.trim()) {
    errors.push('reservant_missing');
  }

  const checked = new Set(input.checkedConsents);
  const required = requiredConsentTypes(input.category, input.hasMinor);
  const missingConsents = required.filter((c) => !checked.has(c));

  // guardian consent needs both the checkbox AND complete guardian info.
  if (input.hasMinor && !guardianComplete(input.guardian)) {
    if (!errors.includes('guardian_incomplete')) errors.push('guardian_incomplete');
  }

  return {
    ok: errors.length === 0 && missingConsents.length === 0,
    missingConsents,
    errors,
  };
}
