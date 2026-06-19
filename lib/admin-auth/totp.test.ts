import { authenticator } from 'otplib';
import { describe, expect, it } from 'vitest';
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
  // PRD §5.8: window=1 → tolerate ±1 step (absorbs the pw-bcrypt delay that straddles a 30s step).
  it('accepts ±1 step (prev/current/next), rejects ±2', () => {
    const secret = authenticator.generateSecret();
    const now = Date.now();
    const at = (ms: number) => authenticator.clone({ epoch: ms }).generate(secret);
    expect(verifyTotp(secret, at(now - 30_000))).toBe(true); // previous step
    expect(verifyTotp(secret, at(now))).toBe(true); // current step
    expect(verifyTotp(secret, at(now + 30_000))).toBe(true); // next step
    expect(verifyTotp(secret, at(now - 60_000))).toBe(false); // -2 steps → out of window
  });
});
