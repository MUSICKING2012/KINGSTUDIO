import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { ROLE_PERMISSIONS, ALL_PERMISSIONS, hasPermission } from './roles';
import { getAdminPermissions } from './rbac';

let adminId: string;
beforeEach(async () => {
  await prisma.adminUserRole.deleteMany();
  await prisma.adminUser.deleteMany({ where: { email: 'rbac@test.local' } });
  for (const name of ['Marketer', 'Operator']) {
    await prisma.adminRole.upsert({ where: { name }, update: { permissions: ROLE_PERMISSIONS[name] }, create: { name, permissions: ROLE_PERMISSIONS[name] } });
  }
  const a = await prisma.adminUser.create({ data: { email: 'rbac@test.local', passwordHash: 'x', name: 'R' } });
  adminId = a.id;
});
afterAll(async () => { await prisma.$disconnect(); });

describe('rbac map', () => {
  it('Super Admin is wildcard', () => expect(ROLE_PERMISSIONS['Super Admin']).toEqual(['*']));
  it('Manager excludes the 6 sensitive perms', () => {
    for (const p of ['refund:process', 'role:grant', 'terms:publish', 'gate:mr_predelivery', 'gate:license_display', 'seo:custom_script'])
      expect(ROLE_PERMISSIONS['Manager']).not.toContain(p);
    expect(ROLE_PERMISSIONS['Manager']).toContain('booking:write');
  });
});

describe('hasPermission', () => {
  it('wildcard grants anything', () => expect(hasPermission(['*'], 'refund:process')).toBe(true));
  it('grants only listed', () => { expect(hasPermission(['booking:read'], 'booking:read')).toBe(true); expect(hasPermission(['booking:read'], 'refund:process')).toBe(false); });
});

describe('getAdminPermissions (union)', () => {
  it('OR-combines roles', async () => {
    const mk = await prisma.adminRole.findUniqueOrThrow({ where: { name: 'Marketer' } });
    const op = await prisma.adminRole.findUniqueOrThrow({ where: { name: 'Operator' } });
    await prisma.adminUserRole.createMany({ data: [{ adminUserId: adminId, adminRoleId: mk.id }, { adminUserId: adminId, adminRoleId: op.id }] });
    const perms = await getAdminPermissions(adminId);
    expect(perms).toContain('promo:manage'); // Marketer
    expect(perms).toContain('blackout:manage'); // Operator
    expect(perms).not.toContain('refund:process');
  });
});
