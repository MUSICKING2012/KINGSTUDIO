// Magic-link resolution (Stage E1, ⚠ §4 위험구역). Turns a raw URL token into the booking's
// downloadable deliverables — or a typed rejection. Storage keys NEVER leave this module's return
// value toward clients: the DTO carries only display-safe fields (하드제약 #5).

import { prisma } from '@/lib/db/prisma';
import type { DeliverableType } from '@prisma/client';
import { hashMagicToken, isPlausibleMagicToken } from './token';

export type DownloadableItem = {
  id: string;
  type: DeliverableType;
  version: number;
  fileSizeBytes: bigint | null;
  releasedAt: Date | null;
};

export type ResolvedMagicLink =
  | { ok: false; reason: 'not_found' | 'revoked' | 'expired' }
  | {
      ok: true;
      magicLinkId: string;
      expiresAt: Date;
      booking: { id: string; date: Date; packageName: string | null };
      items: DownloadableItem[];
    };

// Customer-visible deliverable states. pending/uploading/transcoding are not ready; `superseded`
// is an old version (PRD §5.6: history may be shown, but only the latest downloads); `archived`
// is past retention.
const VISIBLE_STATUSES = ['ready', 'delivered'] as const;

// Resolves a raw token. Lazy expiry (schema note: "expired → set by cron/lazy check"): an active
// row past expiresAt is transitioned here — no cron dependency for correctness. `touch` bumps
// last_accessed_at/access_count (page views; the file API logs downloads separately).
export async function resolveMagicLink(
  rawToken: string,
  opts: { touch?: boolean } = {},
): Promise<ResolvedMagicLink> {
  if (!isPlausibleMagicToken(rawToken)) return { ok: false, reason: 'not_found' };

  const link = await prisma.magicLink.findUnique({
    where: { tokenHash: hashMagicToken(rawToken) },
    include: {
      booking: {
        select: {
          id: true,
          date: true,
          packageSnapshot: true,
          deliverables: {
            where: { status: { in: [...VISIBLE_STATUSES] } },
            orderBy: [{ type: 'asc' }, { version: 'desc' }],
            select: {
              id: true,
              type: true,
              version: true,
              fileSizeBytes: true,
              releasedAt: true,
            },
          },
        },
      },
    },
  });

  if (!link) return { ok: false, reason: 'not_found' };
  if (link.status === 'revoked') return { ok: false, reason: 'revoked' };

  const now = new Date();
  if (link.status === 'expired' || link.expiresAt <= now) {
    if (link.status === 'active') {
      await prisma.magicLink.update({ where: { id: link.id }, data: { status: 'expired' } });
    }
    return { ok: false, reason: 'expired' };
  }

  if (opts.touch) {
    await prisma.magicLink.update({
      where: { id: link.id },
      data: { lastAccessedAt: now, accessCount: { increment: 1 } },
    });
  }

  const snapshot = link.booking.packageSnapshot as { name?: unknown } | null;
  const packageName = typeof snapshot?.name === 'string' ? snapshot.name : null;

  return {
    ok: true,
    magicLinkId: link.id,
    expiresAt: link.expiresAt,
    booking: { id: link.booking.id, date: link.booking.date, packageName },
    items: link.booking.deliverables,
  };
}
