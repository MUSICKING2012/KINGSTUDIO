import { adminAuth } from '@/adminAuth';
import { writeAudit } from '@/lib/admin-auth/audit';
import { ForbiddenError, requirePermission } from '@/lib/admin-auth/rbac';
import { validateAdminSession } from '@/lib/admin-auth/session';
import { prisma } from '@/lib/db/prisma';
import { BookingNotFoundError, reissueMagicLink } from '@/lib/download/magicLink';
import { type NextRequest, NextResponse } from 'next/server';

// Stage E2 — admin CS magic-link reissue (PRD §5.6 "만료 링크 재발급 — 어드민에서 가능",
// ⚠ §4 위험구역: 매직링크). S2.5b-0 admin route chain. Permission: `magiclink:reissue`
// (Content Manager / Manager / Super Admin — PRD §5.8 role table).
// NOT a §5.8 sensitive action — the reauth list (refund, role grant/revoke, account
// delete/deactivate, bulk export, terms publish, consent-bucket policy) does not include
// reissue — so NO password+TOTP re-auth here; RBAC + audit_log is the mandated envelope
// (audit list DOES include 매직링크 재발급).
// Concurrency: the single-active invariant (revoke-then-mint) is enforced INSIDE
// reissueMagicLink via a transaction-scoped advisory lock (E1) — no extra locking here.
// Raw token: returned ONCE in this response to the authorized admin — that is the CS
// purpose of the endpoint (customer lost/expired link; email automation lands in Stage 7).
// 하드제약 #6: the raw token is never logged; the audit record carries the magic_link PK
// only (same PK-not-token linkage as download_logs, PRD C15).

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
    await requirePermission(adminUserId, 'magiclink:reissue');
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    throw err;
  }

  // 5. Parse + validate body
  const body = (await req.json().catch(() => null)) as { bookingId?: unknown } | null;
  const bookingId = body?.bookingId;
  if (typeof bookingId !== 'string' || bookingId.length === 0) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  // 6. Reissue (revokes any active predecessor atomically — advisory lock inside)
  let issued: Awaited<ReturnType<typeof reissueMagicLink>>;
  try {
    issued = await reissueMagicLink(bookingId);
  } catch (err) {
    if (err instanceof BookingNotFoundError) {
      return NextResponse.json({ error: 'booking_not_found' }, { status: 404 });
    }
    throw err;
  }

  // 7. Audit (PRD §5.8 audit list: 매직링크 재발급). PK only — never the raw token (#6).
  await writeAudit({
    actorAdminUserId: adminUserId,
    action: 'magic_link_reissue',
    targetType: 'booking',
    targetId: bookingId,
    metadata: { magicLinkId: issued.magicLink.id },
  });

  // Raw token crosses the wire exactly once, to the authorized admin (CS handoff).
  return NextResponse.json(
    {
      ok: true,
      magicLinkId: issued.magicLink.id,
      rawToken: issued.rawToken,
      expiresAt: issued.magicLink.expiresAt,
    },
    { status: 201 },
  );
}
