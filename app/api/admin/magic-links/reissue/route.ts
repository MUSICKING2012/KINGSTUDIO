import { adminAuth } from '@/adminAuth';
import { ForbiddenError, requirePermission } from '@/lib/admin-auth/rbac';
import { validateAdminSession } from '@/lib/admin-auth/session';
import { prisma } from '@/lib/db/prisma';
import { BookingNotFoundError, reissueMagicLink } from '@/lib/download/magicLink';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
// Atomicity (PR #20 review): reissue + audit_log run in ONE transaction — an audit-write
// failure rolls the reissue back (old link stays active), so a reissue can never exist
// without its §5.8-mandated audit record, and a client retry after a 5xx cannot silently
// revoke a token that was already disclosed.

const ReissueBody = z.object({ bookingId: z.string().trim().min(1) });

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

  // 5. Parse + validate body (shared Zod pattern — CLAUDE.md §1; trims whitespace-only IDs)
  const parsed = ReissueBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }
  const { bookingId } = parsed.data;

  // 6+7. Reissue + audit in ONE transaction. reissueMagicLink composes into the outer tx
  // (E1 design: advisory lock + revoke-then-mint inside), and the audit row (PRD §5.8 list:
  // 매직링크 재발급; PK only — never the raw token, #6) commits or rolls back with it.
  let issued: Awaited<ReturnType<typeof reissueMagicLink>>;
  try {
    issued = await prisma.$transaction(async (tx) => {
      const result = await reissueMagicLink(bookingId, tx);
      await tx.auditLog.create({
        data: {
          actorAdminUserId: adminUserId,
          action: 'magic_link_reissue',
          targetType: 'booking',
          targetId: bookingId,
          metadata: { magicLinkId: result.magicLink.id },
        },
      });
      return result;
    });
  } catch (err) {
    if (err instanceof BookingNotFoundError) {
      return NextResponse.json({ error: 'booking_not_found' }, { status: 404 });
    }
    throw err;
  }

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
