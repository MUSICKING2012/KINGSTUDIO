// Magic-link issue/reissue (Stage E1, ⚠ §4 위험구역). PRD §5.6 C6/C15: 60-day validity, raw token
// never stored (SHA-256 hash only), reissue revokes the old link and mints a fresh token. One
// booking may hold several links over time (1차/2차/재발급) — at most one `active` by construction:
// issue/reissue always revokes prior active links first, inside one transaction.

import { prisma } from '@/lib/db/prisma';
import type { MagicLink, Prisma } from '@prisma/client';
import { generateMagicToken, hashMagicToken } from './token';

export const MAGIC_LINK_TTL_DAYS = 60; // PRD §5.6 C6

export class BookingNotFoundError extends Error {
  constructor(bookingId: string) {
    super(`booking not found: ${bookingId}`);
    this.name = 'BookingNotFoundError';
  }
}

export type IssuedMagicLink = {
  // Raw token — exists ONLY in this return value (→ email/URL). Never log it (하드제약 #6).
  rawToken: string;
  magicLink: MagicLink;
};

async function issueInTx(
  tx: Prisma.TransactionClient,
  bookingId: string,
): Promise<IssuedMagicLink> {
  // Serialize concurrent issue/reissue for the SAME booking so the single-active invariant holds
  // even under simultaneous calls — revoke + create are two statements, so without this two racing
  // reissues could each revoke-then-insert and leave two active rows. A transaction-scoped advisory
  // lock keyed on the booking id auto-releases at commit/rollback; no migration/schema change.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${bookingId}))`;

  const booking = await tx.booking.findUnique({ where: { id: bookingId }, select: { id: true } });
  if (!booking) throw new BookingNotFoundError(bookingId);

  // Reissue semantics (PRD C15): any previously active link is revoked before a new one exists.
  await tx.magicLink.updateMany({
    where: { bookingId, status: 'active' },
    data: { status: 'revoked' },
  });

  const rawToken = generateMagicToken();
  const magicLink = await tx.magicLink.create({
    data: {
      bookingId,
      tokenHash: hashMagicToken(rawToken),
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_DAYS * 86_400_000),
      status: 'active',
    },
  });
  return { rawToken, magicLink };
}

// Issues a fresh magic link for a booking, revoking any active predecessor (single-active
// invariant). Pass `tx` to compose into an outer transaction (e.g. the upload pipeline later).
export async function issueMagicLink(
  bookingId: string,
  tx?: Prisma.TransactionClient,
): Promise<IssuedMagicLink> {
  if (tx) return issueInTx(tx, bookingId);
  return prisma.$transaction((t) => issueInTx(t, bookingId));
}

// Admin CS reissue (PRD §5.6 "만료 링크 재발급 — 어드민에서 가능"). Same primitive; named export
// so the E2 admin route reads as intent. audit_log is written by the CALLING admin route.
export const reissueMagicLink = issueMagicLink;
