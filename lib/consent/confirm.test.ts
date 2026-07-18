import { describe, expect, it } from 'vitest';

import { requiredConfirmConsents, validateBookingConsents } from './confirm';
import type { ConsentType, GuardianInfo } from './step3';

const BOOKING_DATE = '2026-08-01';
const ADULT = '1990-01-01'; // 36 on booking date
const MINOR = '2015-01-01'; // 11 on booking date

const GUARDIAN: GuardianInfo = {
  name: 'Parent',
  relation: 'mother',
  contact: '010-0000-0000',
  email: 'parent@example.com',
};

// Experience required at confirm = tos/privacy/usage_scope + payment.
const EXP_REQUIRED: ConsentType[] = ['tos', 'privacy', 'usage_scope', 'payment'];

describe('requiredConfirmConsents', () => {
  it('experience (no minor) = step3 + payment', () => {
    expect(requiredConfirmConsents('experience', false).sort()).toEqual([...EXP_REQUIRED].sort());
  });
  it('rental adds korean_only + license_self_brought', () => {
    expect(requiredConfirmConsents('rental', false)).toEqual(
      expect.arrayContaining(['korean_only', 'license_self_brought', 'payment']),
    );
  });
  it('minor adds guardian', () => {
    expect(requiredConfirmConsents('experience', true)).toContain('guardian');
  });
});

describe('validateBookingConsents', () => {
  it('adult + all required → ok, hasMinor false', () => {
    const r = validateBookingConsents({
      category: 'experience',
      participantDobs: [ADULT, ADULT],
      bookingDate: BOOKING_DATE,
      checkedConsents: EXP_REQUIRED,
      guardian: null,
    });
    expect(r.ok).toBe(true);
    expect(r.hasMinor).toBe(false);
    expect(r.participantIsMinor).toEqual([false, false]);
  });

  it('missing a required consent → not ok, consent_missing', () => {
    const r = validateBookingConsents({
      category: 'experience',
      participantDobs: [ADULT],
      bookingDate: BOOKING_DATE,
      checkedConsents: ['tos', 'privacy', 'usage_scope'], // no payment
      guardian: null,
    });
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain('consent_missing');
    expect(r.missingConsents).toContain('payment');
  });

  it('SERVER recomputes minor from DOB — client cannot suppress the guardian branch', () => {
    // No guardian consent checked, minor present → blocked regardless of any client hasMinor claim.
    const r = validateBookingConsents({
      category: 'experience',
      participantDobs: [ADULT, MINOR],
      bookingDate: BOOKING_DATE,
      checkedConsents: EXP_REQUIRED, // guardian NOT checked
      guardian: null,
    });
    expect(r.ok).toBe(false);
    expect(r.hasMinor).toBe(true);
    expect(r.participantIsMinor).toEqual([false, true]);
    expect(r.reasons).toContain('minor_guardian_required');
  });

  it('minor + guardian consent but incomplete guardian info → guardian_incomplete', () => {
    const r = validateBookingConsents({
      category: 'experience',
      participantDobs: [MINOR],
      bookingDate: BOOKING_DATE,
      checkedConsents: [...EXP_REQUIRED, 'guardian'],
      guardian: { ...GUARDIAN, email: '' },
    });
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain('guardian_incomplete');
  });

  it('minor + guardian consent + complete info → ok', () => {
    const r = validateBookingConsents({
      category: 'experience',
      participantDobs: [MINOR],
      bookingDate: BOOKING_DATE,
      checkedConsents: [...EXP_REQUIRED, 'guardian'],
      guardian: GUARDIAN,
    });
    expect(r.ok).toBe(true);
    expect(r.hasMinor).toBe(true);
  });

  it('rental requires korean_only + license_self_brought', () => {
    const r = validateBookingConsents({
      category: 'rental',
      participantDobs: [ADULT],
      bookingDate: BOOKING_DATE,
      checkedConsents: ['tos', 'privacy', 'usage_scope', 'payment'],
      guardian: null,
    });
    expect(r.ok).toBe(false);
    expect(r.missingConsents).toEqual(
      expect.arrayContaining(['korean_only', 'license_self_brought']),
    );
  });

  it('empty or malformed DOB → dob_invalid (never proceeds)', () => {
    expect(
      validateBookingConsents({
        category: 'experience',
        participantDobs: [],
        bookingDate: BOOKING_DATE,
        checkedConsents: EXP_REQUIRED,
        guardian: null,
      }).reasons,
    ).toContain('dob_invalid');

    expect(
      validateBookingConsents({
        category: 'experience',
        participantDobs: ['not-a-date'],
        bookingDate: BOOKING_DATE,
        checkedConsents: EXP_REQUIRED,
        guardian: null,
      }).reasons,
    ).toContain('dob_invalid');
  });
});
