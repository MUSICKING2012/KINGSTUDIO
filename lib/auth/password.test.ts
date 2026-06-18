import { describe, expect, it, vi } from 'vitest';
import { hashPassword, isPwned, isStrong, verifyPassword } from './password';

describe('hash/verify', () => {
  it('round-trips a password', async () => {
    const h = await hashPassword('abcd1234ef');
    expect(h).not.toContain('abcd1234ef');
    expect(await verifyPassword('abcd1234ef', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });
});

describe('isStrong (zxcvbn)', () => {
  it('rejects a weak password', () => expect(isStrong('password').ok).toBe(false));
  it('accepts a strong password', () => expect(isStrong('xK9!mq2vRt7wZ').ok).toBe(true));
});

describe('isPwned (HIBP, fail-open)', () => {
  it('returns a boolean when the API responds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => 'AAAA:3\n0018A45C4D1DEF81644B54AB7F969B88D65:2',
      })),
    );
    expect(typeof (await isPwned('whatever'))).toBe('boolean');
  });
  it('fails open on fetch error (returns false)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('down');
      }),
    );
    expect(await isPwned('whatever')).toBe(false);
  });
});
