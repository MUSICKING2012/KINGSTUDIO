import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import zxcvbn from 'zxcvbn';

// 🔒 bcrypt cost 12 (security §3.6).
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// zxcvbn: require score >= 3. Returns feedback for the UI.
export function isStrong(plain: string): { ok: boolean; score: number; warning: string } {
  const r = zxcvbn(plain);
  return { ok: r.score >= 3, score: r.score, warning: r.feedback.warning ?? '' };
}

// HIBP range API (k-anonymity). FAIL-OPEN: never block signup on an HIBP outage.
export async function isPwned(plain: string): Promise<boolean> {
  try {
    const sha1 = createHash('sha1').update(plain).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split('\n').some((line) => line.split(':')[0].trim() === suffix);
  } catch {
    return false; // fail-open
  }
}
