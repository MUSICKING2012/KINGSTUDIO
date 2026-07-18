// Review submission (Stage F, PRD §5.9). Validates a magic-link-authenticated submission and
// writes the Review row. The raw token is verified via resolveMagicLink with touch:false — the
// download page entry already touched (access_count), so submitting must not double-count.
// 하드제약 #6: the token never appears in logs, error messages, or thrown values from this module.
// language: server-VALIDATED request locale (URL locale via the form) — Booking has no locale
// field, so it cannot be server-derived. packageSnapshot is copied verbatim from the Booking
// snapshot; the Package table is never re-queried (price/name drift must not leak into reviews).

import { prisma } from '@/lib/db/prisma';
import { resolveMagicLink } from '@/lib/download/verify';
import { Locale, ReviewTag } from '@prisma/client';
import { z } from 'zod';
import { maskAuthorName } from './mask';

export const ReviewSubmitSchema = z.object({
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.nativeEnum(ReviewTag)).min(1).max(5),
  body: z.string().max(500).optional(),
  locale: z.nativeEnum(Locale),
  token: z.string(),
});

export type ReviewSubmitInput = z.infer<typeof ReviewSubmitSchema>;

export type SubmitReviewResult =
  | { ok: false; reason: 'not_found' | 'revoked' | 'expired' | 'already_reviewed' }
  | { ok: true; reviewId: string };

// Structural P2002 check (unique violation on Review.bookingId). Deliberately not instanceof
// PrismaClientKnownRequestError: structural checks survive client bundle boundaries and are
// trivially fakeable in unit tests.
function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2002';
}

export async function submitReview(input: ReviewSubmitInput): Promise<SubmitReviewResult> {
  const resolved = await resolveMagicLink(input.token, { touch: false });
  if (!resolved.ok) return { ok: false, reason: resolved.reason };

  // The link row survived but the booking may have been deleted between resolution and here —
  // and the DTO deliberately excludes customerName/packageSnapshot (PII must not ride the
  // download path), so re-read exactly what the review needs.
  const booking = await prisma.booking.findUnique({
    where: { id: resolved.booking.id },
    select: { customerName: true, packageSnapshot: true },
  });
  if (!booking) return { ok: false, reason: 'not_found' };

  const authorDisplay = maskAuthorName(booking.customerName ?? '');

  try {
    const review = await prisma.review.create({
      data: {
        bookingId: resolved.booking.id,
        rating: input.rating,
        tags: input.tags,
        body: input.body?.trim() || null,
        authorDisplay,
        authorNameSnapshot: booking.customerName,
        packageSnapshot: booking.packageSnapshot ?? {},
        language: input.locale,
        // Stage 7 wiring point: rating <= 2 → urgent alert (Slack #urgent + 카카오, 24h SLA).
      },
    });
    return { ok: true, reviewId: review.id };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: 'already_reviewed' };
    throw e;
  }
}
