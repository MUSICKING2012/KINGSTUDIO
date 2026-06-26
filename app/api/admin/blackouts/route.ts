import { adminAuth } from '@/adminAuth';
import { prisma } from '@/lib/db/prisma';
import { ForbiddenError, requirePermission } from '@/lib/admin-auth/rbac';
import { validateAdminSession } from '@/lib/admin-auth/session';
import { NextResponse } from 'next/server';

export async function POST() {
  // 1. JWT validity (fast path — no DB)
  const session = await adminAuth();
  const sessionId = (session as { sessionId?: string } | null)?.sessionId;
  if (!session || !sessionId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2. DB-authoritative session check (AdminSession is SoT, not JWT)
  const validated = await validateAdminSession(sessionId);
  if (!validated) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { adminUserId } = validated;

  // 3. Status check (validateAdminSession does not verify active/inactive/locked)
  const admin = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: { status: true },
  });
  if (!admin || admin.status !== 'active') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 4. Permission guard
  try {
    await requirePermission(adminUserId, 'blackout:manage');
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    throw err;
  }

  // 5. Stub — business logic in S2.5b-2
  return NextResponse.json({ error: 'not_implemented' }, { status: 501 });
}
