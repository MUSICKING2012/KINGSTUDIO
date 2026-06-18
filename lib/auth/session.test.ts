import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { createSession, validateSession, revokeSession, revokeAllSessions } from './session';

let userId: string;
beforeEach(async () => {
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany({ where: { email: 'sess@test.local' } });
  const u = await prisma.user.create({ data: { email: 'sess@test.local' } });
  userId = u.id;
});
afterAll(async () => { await prisma.$disconnect(); });

describe('session store', () => {
  it('creates and validates a session', async () => {
    const { sessionId } = await createSession(userId, { ip: '1.1.1.1', country: 'TW', userAgent: 'UA' });
    expect(await validateSession(sessionId)).toMatchObject({ userId });
  });
  it('returns null for an expired session', async () => {
    const { sessionId } = await createSession(userId, { ip: null, country: null, userAgent: null });
    await prisma.userSession.update({ where: { id: sessionId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateSession(sessionId)).toBeNull();
  });
  it('revokes a single session', async () => {
    const { sessionId } = await createSession(userId, { ip: null, country: null, userAgent: null });
    await revokeSession(sessionId);
    expect(await validateSession(sessionId)).toBeNull();
  });
  it('revokes all sessions for a user', async () => {
    const a = await createSession(userId, { ip: null, country: null, userAgent: null });
    const b = await createSession(userId, { ip: null, country: null, userAgent: null });
    await revokeAllSessions(userId);
    expect(await validateSession(a.sessionId)).toBeNull();
    expect(await validateSession(b.sessionId)).toBeNull();
  });
});
