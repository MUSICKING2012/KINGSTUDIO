import { authenticator } from 'otplib';

// otplib default 30s step, ±1 window tolerance. Returns false on any malformed input (never throws).
export function verifyTotp(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}
