import { describe, expect, it, beforeAll } from 'vitest';
import { encryptSecret, decryptSecret } from './crypto';

beforeAll(() => { process.env.ADMIN_TOTP_ENC_KEY = Buffer.alloc(32, 7).toString('base64'); });

describe('crypto (AES-256-GCM)', () => {
  it('round-trips a secret', () => {
    const enc = encryptSecret('JBSWY3DPEHPK3PXP');
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP');
    expect(enc.startsWith('v1:')).toBe(true); // key-version prefix
    expect(decryptSecret(enc)).toBe('JBSWY3DPEHPK3PXP');
  });
  it('produces different ciphertext each time (random IV)', () => {
    expect(encryptSecret('x')).not.toBe(encryptSecret('x'));
  });
});
