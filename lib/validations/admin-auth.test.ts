import { describe, expect, it } from 'vitest';
import { adminLoginSchema } from './admin-auth';

describe('adminLoginSchema', () => {
  it('accepts a valid admin login', () => {
    expect(
      adminLoginSchema.safeParse({ email: 'a@b.com', password: 'abcdefghij12', totp: '123456' })
        .success,
    ).toBe(true);
  });
  it('rejects password shorter than 12', () => {
    expect(
      adminLoginSchema.safeParse({ email: 'a@b.com', password: 'short1', totp: '123456' }).success,
    ).toBe(false);
  });
  it('rejects non-6-digit TOTP', () => {
    expect(
      adminLoginSchema.safeParse({ email: 'a@b.com', password: 'abcdefghij12', totp: '12ab' })
        .success,
    ).toBe(false);
  });
});
