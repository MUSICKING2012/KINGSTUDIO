import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { checkDownloadRateLimit } from '@/lib/download/rateLimit';
import { resolveMagicLink } from '@/lib/download/verify';
import { SIGNED_URL_TTL_SECONDS, getStorageAdapter } from '@/lib/storage';

// Download file endpoint (Stage E1, ⚠ §4 위험구역 — the ONLY path from a magic link to file bytes).
// Flow: raw token re-verified server-side → per-IP rate limit (PRD §5.6 50/5min) → deliverable
// ownership + downloadable-state check → signed URL (TTL 10min, 하드제약 #5) → download_logs write
// (identity snapshots frozen for the dispute pack). The response carries ONLY the signed URL —
// never a storage key. No PII in logs (하드제약 #6).
export const dynamic = 'force-dynamic';

type Body = { token?: string; deliverableId?: string };

function clientIp(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? null;
  return request.headers.get('x-real-ip');
}

export async function POST(request: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (typeof body.token !== 'string' || typeof body.deliverableId !== 'string') {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const resolved = await resolveMagicLink(body.token);
  if (!resolved.ok) {
    const status = resolved.reason === 'not_found' ? 404 : 410;
    return NextResponse.json({ error: resolved.reason }, { status });
  }

  const ip = clientIp(request);
  const rate = await checkDownloadRateLimit(ip);
  if (!rate.allowed) {
    // PRD §5.6 abnormal-frequency auto-block. Admin alert wiring = Stage 7 (notification stage).
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  // Ownership + state re-check against the resolved link's own item list (not client claims).
  const item = resolved.items.find((d) => d.id === body.deliverableId);
  if (!item) return NextResponse.json({ error: 'deliverable_not_found' }, { status: 404 });

  // Server-side storage-key read — the key never enters any response payload (하드제약 #5).
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: item.id },
    select: { storageKey: true, type: true, version: true },
  });
  if (!deliverable?.storageKey) {
    return NextResponse.json({ error: 'deliverable_not_ready' }, { status: 409 });
  }

  const fileName = deliverable.storageKey.split('/').pop() ?? `${item.type}_v${item.version}`;
  const url = await getStorageAdapter().createSignedDownloadUrl({
    bucket: 'content',
    key: deliverable.storageKey,
    ttlSeconds: SIGNED_URL_TTL_SECONDS,
    downloadFileName: fileName,
  });

  await prisma.downloadLog.create({
    data: {
      magicLinkId: resolved.magicLinkId,
      deliverableId: item.id,
      deliverableTypeSnapshot: deliverable.type,
      fileNameSnapshot: fileName,
      ip,
      userAgent: request.headers.get('user-agent'),
    },
  });

  return NextResponse.json({ url, expiresInSeconds: SIGNED_URL_TTL_SECONDS });
}
