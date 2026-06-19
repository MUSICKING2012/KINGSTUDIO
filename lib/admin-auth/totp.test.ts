import { describe, expect, it } from 'vitest';
import { authenticator } from 'otplib';
import { verifyTotp } from './totp';

describe('verifyTotp', () => {
  it('accepts a current code', () => {
    const secret = authenticator.generateSecret();
    expect(verifyTotp(secret, authenticator.generate(secret))).toBe(true);
  });
  it('rejects a wrong code', () => {
    const secret = authenticator.generateSecret();
    expect(verifyTotp(secret, '000000')).toBe(false);
  });
});
