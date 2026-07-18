import { checkReviewRateLimit } from '@/lib/review/rateLimit';
import { ReviewSubmitSchema, type SubmitReviewResult, submitReview } from '@/lib/review/submit';
import { NextResponse } from 'next/server';

// Review submission endpoint (Stage F, PRD §5.9). Magic-link-authenticated: the raw token in the
// body is the only credential, re-verified server-side inside submitReview (never trusted here).
// 하드제약 #6: the token is never echoed into any response, log, or error payload.
//
// Order deviates from the E1 download route ON PURPOSE. E1 resolves the token BEFORE the rate
// limit; this is a WRITE endpoint, so the per-IP throttle runs FIRST — an unauthenticated caller
// must not be able to probe tokens (or reach the DB at all) more than 5 times per 5 minutes.
// E1's ordering is left untouched (⚠ §4 위험구역, out of scope for this slice).
//
// clientIp is an inline copy of the E1 helper, not an import: lib/auth/device.ts#metaFromHeaders
// has no x-real-ip fallback and returns country/userAgent this route does not want, and lifting a
// shared helper would require editing the frozen E1 route. Consolidate when §4 unfreezes.
export const dynamic = 'force-dynamic';

function clientIp(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? null;
  return request.headers.get('x-real-ip');
}

// Exhaustive by construction: adding a reason to SubmitReviewResult breaks tsc here rather than
// silently falling through to a default status.
const FAILURE_STATUS: Record<Extract<SubmitReviewResult, { ok: false }>['reason'], number> = {
  not_found: 404,
  revoked: 410,
  expired: 410,
  already_reviewed: 409,
};

export async function POST(request: Request): Promise<Response> {
  // 1. Per-IP throttle — before any parsing or DB access.
  // NOTE: §5.9 mandates no per-IP review limit. Its only stated posture is that writing a
  // review is optional and downloads are unconditional. The applicable written rule is the
  // global "API 100req/min/IP" security baseline; 5/5min is a stricter implementation
  // judgement (see lib/review/rateLimit.ts), queued for a §5.9 amendment.
  const ip = clientIp(request);
  const rate = await checkReviewRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  // 2. Parse + validate. The 400 body carries a fixed code only — never the offending input,
  // because the payload contains the magic-link token (#6).
  const parsed = ReviewSubmitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  // 3. Submit. Token verification, PII re-read, masking and the unique-per-booking guarantee all
  // live in submitReview; this route only maps outcomes to HTTP.
  const result = await submitReview(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: FAILURE_STATUS[result.reason] });
  }

  return NextResponse.json({ ok: true, reviewId: result.reviewId }, { status: 201 });
}
