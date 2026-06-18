import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db/prisma';

vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn(async () => ({ dev: true })) }));
import { sendEmail } from '@/lib/email/send';
import { registerUser } from './signup';

beforeEach(async () => {
  await prisma.emailVerification.deleteMany();
  await prisma.user.deleteMany({ where: { email: 'new@test.local' } });
  vi.mocked(sendEmail).mockClear();
});
afterAll(async () => { await prisma.$disconnect(); });

describe('registerUser', () => {
  it('creates a user, hashes the password, issues a verify token, sends email', async () => {
    const r = await registerUser({ email: 'new@test.local', password: 'xK9!mq2vRt7wZ', name: 'New' });
    expect(r.ok).toBe(true);
    const u = await prisma.user.findUnique({ where: { email: 'new@test.local' } });
    expect(u?.passwordHash).toBeTruthy();
    expect(u?.passwordHash).not.toContain('xK9');
    expect(u?.emailVerified).toBeNull();
    expect(await prisma.emailVerification.count({ where: { userId: u!.id } })).toBe(1);
    expect(sendEmail).toHaveBeenCalledOnce();
  });
  it('rejects a duplicate email', async () => {
    await prisma.user.create({ data: { email: 'new@test.local' } });
    const r = await registerUser({ email: 'new@test.local', password: 'xK9!mq2vRt7wZ', name: 'Dup' });
    expect(r).toMatchObject({ ok: false, error: 'email.taken' });
  });
  it('rejects a breached password (HIBP)', async () => {
    const r = await registerUser({ email: 'new@test.local', password: 'Password123', name: 'X', _pwnedForTest: true });
    expect(r).toMatchObject({ ok: false, error: 'password.pwned' });
  });
});
