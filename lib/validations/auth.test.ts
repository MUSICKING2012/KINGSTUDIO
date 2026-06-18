import { describe, expect, it } from 'vitest';
import { loginSchema, signupSchema } from './auth';

describe('signupSchema', () => {
  it('accepts a valid signup', () => {
    const r = signupSchema.safeParse({ email: 'a@b.com', password: 'abcd1234ef', name: 'Aria' });
    expect(r.success).toBe(true);
  });
  it('rejects password shorter than 10', () => {
    expect(signupSchema.safeParse({ email: 'a@b.com', password: 'abc123', name: 'A' }).success).toBe(false);
  });
  it('rejects password without a digit', () => {
    expect(signupSchema.safeParse({ email: 'a@b.com', password: 'abcdefghij', name: 'A' }).success).toBe(false);
  });
  it('rejects invalid email', () => {
    expect(signupSchema.safeParse({ email: 'nope', password: 'abcd1234ef', name: 'A' }).success).toBe(false);
  });
});
describe('loginSchema', () => {
  it('accepts email + password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });
});
