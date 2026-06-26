import { adminAuth } from '@/adminAuth';
import { prisma } from '@/lib/db/prisma';
import { writeAudit } from '@/lib/admin-auth/audit';
import { ForbiddenError, requirePermission } from '@/lib/admin-auth/rbac';
import { validateAdminSession } from '@/lib/admin-auth/session';
import { BlackoutValidationError, validateBlackoutInput } from '@/lib/slots/blackoutInput';
import { toTimeDate } from '@/lib/slots/confirmBooking';
import { toDbDate } from '@/lib/slots/time';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
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

  // 5. Parse + validate body
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  let v: ReturnType<typeof validateBlackoutInput>;
  try {
    v = validateBlackoutInput(body);
  } catch (err) {
    if (err instanceof BlackoutValidationError) {
      return NextResponse.json(
        { error: 'validation', field: err.field, message: err.message },
        { status: 422 },
      );
    }
    throw err;
  }

  const data = {
    scope: v.scope,
    dateStart: toDbDate(v.dateStart),   // @db.Date carrier
    dateEnd: toDbDate(v.dateEnd),       // @db.Date carrier
    timeStart: v.timeStart !== null ? toTimeDate(v.timeStart) : null,  // @db.Time(0) carrier
    timeEnd: v.timeEnd !== null ? toTimeDate(v.timeEnd) : null,
    recurringRule: v.recurringRule,
    reason: v.reason,
    reasonNote: v.reasonNote,
    roomId: v.roomId,
    createdBy: adminUserId,
  };

  let created: Awaited<ReturnType<typeof prisma.blackout.create>>;
  try {
    created = await prisma.blackout.create({ data });
  } catch (err) {
    // Final safety net: CHECK constraint violated despite app-layer validation
    console.error('[blackout.create] CHECK constraint violated:', err);
    return NextResponse.json(
      { error: 'validation', field: 'db_check', message: 'database constraint violated' },
      { status: 422 },
    );
  }

  await writeAudit({
    actorAdminUserId: adminUserId,
    action: 'blackout_create',
    targetType: 'blackout',
    targetId: created.id,
    metadata: { scope: v.scope, dateStart: v.dateStart, dateEnd: v.dateEnd, roomId: v.roomId },
  });

  return NextResponse.json({ blackout: created }, { status: 201 });
}
