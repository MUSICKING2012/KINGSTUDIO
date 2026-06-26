import type { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export async function writeAudit(input: {
  actorAdminUserId: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.auditLog.create({ data: input });
}
