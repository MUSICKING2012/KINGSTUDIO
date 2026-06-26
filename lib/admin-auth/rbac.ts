import { prisma } from '@/lib/db/prisma';
import { hasPermission } from './roles';

export { ALL_PERMISSIONS, ROLE_PERMISSIONS, hasPermission } from './roles';
export type { Permission } from './roles';

export async function getAdminPermissions(adminUserId: string): Promise<string[]> {
  const roles = await prisma.adminUserRole.findMany({
    where: { adminUserId },
    include: { adminRole: { select: { permissions: true } } },
  });
  const set = new Set<string>();
  for (const r of roles) for (const p of r.adminRole.permissions as string[]) set.add(p);
  return [...set];
}

export class ForbiddenError extends Error {
  constructor(perm: string) {
    super(`FORBIDDEN: missing ${perm}`);
    this.name = 'ForbiddenError';
  }
}

// Guard for server actions / route handlers. Throws ForbiddenError on denial (caller maps to 403).
export async function requirePermission(adminUserId: string, required: string): Promise<void> {
  if (!hasPermission(await getAdminPermissions(adminUserId), required)) {
    throw new ForbiddenError(required);
  }
}
