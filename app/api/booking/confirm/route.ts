import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import {
  type ConfirmRequestBody,
  classifyConfirmBookingError,
  clientIp,
  executeConfirmedBooking,
  prepareBookingConfirm,
} from '@/lib/booking/confirmRequest';
import { prisma } from '@/lib/db/prisma';
import { getPaymentGateway } from '@/lib/payment';
import type { Pg } from '@prisma/client';

// Booking Step 4 — checkout confirm (Stage D, ⚠ 최대 위험구역). The SINGLE server entry point that
// turns a client draft into a confirmed+paid booking via the SYNC-capture model (§5.5):
//   1) prepareBookingConfirm (lib/booking/confirmRequest — shared with the Inicis redirect flow):
//      authoritative reload of package/pricing, returning-discount resolution, PRE-CAPTURE consent/
//      minor re-validation (reject with NO charge), room assignment
//   2) mock PG capture (final KRW total)
//   3) executeConfirmedBooking → confirmBooking (slot lock + overlap re-check + Booking/Consent/
//      Participant/Payment atomic write; re-validates consents/minor AGAIN — un-bypassable, 하드제약 #4)
//   4) any post-capture failure (23P01 slot lost, or defense-in-depth guard trip) → auto-refund
//      (PG fee absorbed) + audit_log(refund); NO Refund row on the sync path (§5.5-D).
// KRW single-currency only (하드제약 #2). This route is the authoritative price/consent boundary;
// the checkout UI is presentation only. The KG이니시스 redirect flow lives in /api/payment/inicis/*
// and shares the SAME validation/pricing/write pipeline (진실 이중화 방지).
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  let body: ConfirmRequestBody;
  try {
    body = (await request.json()) as ConfirmRequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // userId resolution stays in the route (session cookie context); the shared pipeline never
  // calls auth() itself (the Inicis return leg is a cross-site POST without session cookies).
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  const prep = await prepareBookingConfirm(body, userId);
  if (!prep.ok) {
    return NextResponse.json(prep.body, { status: prep.status });
  }
  const { ctx } = prep;

  // ── mock PG 캡처 (최종 KRW 총액) ────────────────────────────────────────────────────────────
  const gateway = getPaymentGateway(ctx.pg);
  const capture = await gateway.capture({
    pg: ctx.pg,
    amountKrw: ctx.finalTotalKrw,
    idempotencyKey: `${ctx.packageSlug}:${ctx.date}:${ctx.startTime}:${ctx.reservant.email}`,
    description: `KING STUDIO ${ctx.pkg.name}`,
  });
  if (!capture.ok) {
    return NextResponse.json({ error: 'payment_failed', reason: capture.reason }, { status: 402 });
  }

  // ── confirmBooking (락+overlap 재검사+원자 쓰기+authoritative 동의/미성년 재검증) ─────────────
  try {
    const result = await executeConfirmedBooking(
      ctx,
      {
        pg: ctx.pg,
        amountKrw: ctx.finalTotalKrw,
        pgFeeKrw: capture.pgFeeKrw,
        pgTransactionId: capture.pgTransactionId,
      },
      { ip: clientIp(request), userAgent: request.headers.get('user-agent') },
    );

    return NextResponse.json({
      ok: true,
      bookingId: result.bookingId,
      date: ctx.date,
      startTime: result.startTime,
      endTime: result.endTime,
      totalKrw: ctx.finalTotalKrw,
    });
  } catch (e) {
    // ── 캡처 後 실패 → 자동환불 (PG 수수료 미공제) + audit_log(refund). 동기(23P01) 경로는
    //    Refund 레코드 없이 처리(§5.5-D) — 트랜잭션 롤백으로 Payment 자체가 없음.
    const kind = classifyConfirmBookingError(e);

    if (kind !== 'unknown') {
      const concurrentLost = kind === 'concurrent_lost';
      await autoRefund(ctx.pg, capture.pgTransactionId, ctx.finalTotalKrw, {
        reason: concurrentLost ? 'concurrent_booking_lost' : 'consent_guard_post_capture',
        bookingDate: ctx.date,
        startTime: ctx.startTime,
        ip: clientIp(request),
        userAgent: request.headers.get('user-agent'),
      });
      return NextResponse.json(
        { error: concurrentLost ? 'concurrent_booking_lost' : 'consent_invalid', refunded: true },
        { status: 409 },
      );
    }

    console.error('[api/booking/confirm] confirmBooking failed:', e);
    // 알 수 없는 실패도 캡처가 성공했으므로 환불 시도(고객 보호) 후 500.
    await autoRefund(ctx.pg, capture.pgTransactionId, ctx.finalTotalKrw, {
      reason: 'internal_error',
      bookingDate: ctx.date,
      startTime: ctx.startTime,
      ip: clientIp(request),
      userAgent: request.headers.get('user-agent'),
    });
    return NextResponse.json({ error: 'internal_error', refunded: true }, { status: 500 });
  }
}

// 캡처 성공 후 예약 확정 실패 시 PG 환불 실행 + audit_log 기록(§5.5-D). Refund 레코드는 만들지 않는다
// (동기 경로 = 결제 레코드 미존재). 환불·감사 실패는 삼켜서 응답을 막지 않되 콘솔에 남긴다(수동 대사용).
async function autoRefund(
  pg: Pg,
  pgTransactionId: string,
  amountKrw: number,
  meta: Record<string, unknown> & { reason: string; ip?: string | null; userAgent?: string | null },
): Promise<void> {
  const gateway = getPaymentGateway(pg);
  try {
    const r = await gateway.refund({ pg, pgTransactionId, amountKrw, reason: meta.reason });
    if (!r.ok)
      console.error('[api/booking/confirm] auto-refund failed:', r.reason, pgTransactionId);
  } catch (e) {
    console.error('[api/booking/confirm] auto-refund threw:', e, pgTransactionId);
  }
  try {
    await prisma.auditLog.create({
      data: {
        actorAdminUserId: null, // system-triggered (§5.5-D)
        action: 'refund',
        targetType: 'payment',
        targetId: pgTransactionId,
        metadata: { pg, amountKrw, pgFeeDeducted: false, ...meta },
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });
  } catch (e) {
    console.error('[api/booking/confirm] audit_log write failed:', e);
  }
}
