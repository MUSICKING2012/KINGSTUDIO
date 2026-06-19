import { authenticator } from 'otplib';

// otplib's verify window DEFAULTS to 0 (only the exact current 30s step). Per PRD §5.8 this module
// uses window=1 → ±1 step (±30s) tolerance, absorbing the password-bcrypt processing delay + clock
// skew (RFC 6238; token validity max 90s). Scoped to a dedicated cloned verifier so token
// generation is unaffected (generate ignores window) and the shared `authenticator` isn't mutated.
const verifier = authenticator.clone({ window: 1 });

// Returns false on any malformed input (never throws).
export function verifyTotp(secret: string, token: string): boolean {
  try {
    return verifier.verify({ token, secret });
  } catch {
    return false;
  }
}
