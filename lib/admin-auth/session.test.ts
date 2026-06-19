import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { createAdminSession, validateAdminSession, revokeAdminSession, revokeAllAdminSessions } from './session';

let adminId: string;
beforeEach(async () => {
  await prisma.adminSession.deleteMany();
  await prisma.adminUser.deleteMany({ where: { email: 'asess@test.local' } });
  const a = await prisma.adminUser.create({ data: { email: 'asess@test.local', passwordHash: 'x', name: 'A' } });
  adminId = a.id;
});
afterAll(async () => { await prisma.$disconnect(); });

describe('admin session store', () => {
  it('creates and validates', async () => {
    const { sessionId } = await createAdminSession(adminId, { ip: null, country: null, userAgent: null });
    expect(await validateAdminSession(sessionId)).toMatchObject({ adminUserId: adminId });
  });
  it('expires after 8h (sliding)', async () => {
    const { sessionId } = await createAdminSession(adminId, { ip: null, country: null, userAgent: null });
    await prisma.adminSession.update({ where: { id: sessionId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateAdminSession(sessionId)).toBeNull();
  });
  it('keeps at most 3 concurrent (evicts oldest)', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) ids.push((await createAdminSession(adminId, { ip: null, country: null, userAgent: null })).sessionId);
    expect(await prisma.adminSession.count({ where: { adminUserId: adminId } })).toBe(3);
    expect(await validateAdminSession(ids[0])).toBeNull(); // first (oldest) evicted
  });
  it('revokes single and all', async () => {
    const a = await createAdminSession(adminId, { ip: null, country: null, userAgent: null });
    await revokeAdminSession(a.sessionId);
    expect(await validateAdminSession(a.sessionId)).toBeNull();
    const b = await createAdminSession(adminId, { ip: null, country: null, userAgent: null });
    await revokeAllAdminSessions(adminId);
    expect(await validateAdminSession(b.sessionId)).toBeNull();
  });
});
