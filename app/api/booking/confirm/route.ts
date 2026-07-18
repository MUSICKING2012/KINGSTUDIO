import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { resolveReturningEligibility } from '@/lib/booking/eligibility';
import { currentRefundPolicySnapshot } from '@/lib/booking/refundPolicy';
import { resolveDiscounts } from '@/lib/catalog/discount';
import { isPackageViewable } from '@/lib/catalog/package-visibility';
import { computePackageTotal } from '@/lib/catalog/pricing';
import { getPackageBySlug } from '@/lib/catalog/queries';
import { validateBookingConsents } from '@/lib/consent/confirm';
import type { ConsentType, GuardianInfo } from '@/lib/consent/step3';
import { prisma } from '@/lib/db/prisma';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { type Locale, locales } from '@/lib/i18n/routing';
import { getPaymentGateway } from '@/lib/payment';
import { SlotLockError } from '@/lib/redis/slotLock';
import { getAvailability } from '@/lib/slots/availability';
import {
  BookingUnavailableError,
  ConsentRequiredError,
  InvalidConsentInputError,
  MinorConsentRequiredError,
  SlotConflictError,
  confirmBooking,
} from '@/lib/slots/confirmBooking';
import { resolvePackageTier } from '@/lib/slots/publicAvailability';
import { InvalidDateInputError } from '@/lib/slots/time';
import { isWithinBookingWindow } from '@/lib/slots/window';
import type { Pg } from '@prisma/client';

// Booking Step 4 — checkout confirm (Stage D, ⚠ 최대 위험구역). The SINGLE server entry point that
// turns a client draft into a confirmed+paid booking. Flow (§5.5 동기 캡처 모델):
//   1) authoritative reload of package/pricing from DB (never trust client amounts)
//   2) resolve returning-member discount eligibility (auth + DB) → resolveDiscounts (final total)
//   3) PRE-CAPTURE server consent/minor re-validation → reject with NO charge if invalid
//   4) mock PG capture (final KRW total)
//   5) confirmBooking (slot lock + overlap re-check + Booking/Consent/Participant/Payment atomic write;
//      it re-validates consents/minor AGAIN — the un-bypassable guard, 하드제약 #4)
//   6) any post-capture failure (23P01 slot lost, or defense-in-depth guard trip) → auto-refund
//      (PG fee absorbed) + audit_log(refund); NO Refund row on the sync path (§5.5-D).
// KRW single-currency only (하드제약 #2). This route is the authoritative price/consent boundary;
// the checkout UI is presentation only.
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}:\d{2}$/;
const PGS: Pg[] = ['inicis', 'paypal'];

type ConfirmBody = {
  package?: string;
  date?: string;
  startTime?: string;
  headcount?: number;
  songId?: string | null;
  reservant?: {
    name?: string;
    email?: string;
    phone?: string;
    nationality?: string;
    passportName?: string;
  };
  participantDobs?: string[];
  guardian?: GuardianInfo | null;
  consents?: ConsentType[];
  pg?: string;
  locale?: string;
};

function clientIp(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? null;
  return request.headers.get('x-real-ip');
}

export async function POST(request: Request): Promise<Response> {
  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const {
    package: packageSlug,
    date,
    startTime,
    headcount,
    songId,
    reservant,
    participantDobs,
    guardian,
    consents,
    pg,
    locale: localeParam,
  } = body;

  // ── 1) 입력 형태 검증 ──────────────────────────────────────────────────────────────────────
  if (
    !packageSlug ||
    !date ||
    !DATE_RE.test(date) ||
    !startTime ||
    !TIME_RE.test(startTime) ||
    !localeParam ||
    !locales.includes(localeParam as Locale) ||
    !pg ||
    !PGS.includes(pg as Pg) ||
    typeof headcount !== 'number' ||
    !Array.isArray(participantDobs) ||
    !Array.isArray(consents) ||
    !reservant?.email
  ) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }
  if (participantDobs.length !== headcount || headcount < 1) {
    return NextResponse.json({ error: 'headcount_mismatch' }, { status: 400 });
  }
  if (!isWithinBookingWindow(date)) {
    return NextResponse.json({ error: 'out_of_window' }, { status: 400 });
  }

  const prismaLocale = toPrismaLocale(localeParam as Locale);
  const chosenPg = pg as Pg;

  // ── 2) 패키지·가격 authoritative 재로딩 (클라 금액 불신) ────────────────────────────────────
  const pkg = await getPackageBySlug(packageSlug);
  if (!isPackageViewable(pkg, prismaLocale)) {
    return NextResponse.json({ error: 'package_not_available' }, { status: 404 });
  }
  const tier = resolvePackageTier(pkg.name);
  if (!tier) {
    return NextResponse.json({ error: 'not_slot_bookable' }, { status: 400 });
  }

  let priceResult: ReturnType<typeof computePackageTotal>;
  try {
    priceResult = computePackageTotal(pkg, headcount);
  } catch {
    return NextResponse.json({ error: 'headcount_out_of_range' }, { status: 400 });
  }

  // ── 3) 재방문 할인 자격 → 최종 총액 (§5.9) ────────────────────────────────────────────────
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const returningEligible = await resolveReturningEligibility(
    userId,
    pkg.returningDiscountEligible,
  );
  const discount = resolveDiscounts({ subtotalKrw: priceResult.totalKrw, returningEligible });
  const finalTotalKrw = discount.totalKrw;

  // ── 4) 캡처 前 서버 동의/미성년 재검증 — 실패 시 무청구 거부 ────────────────────────────────
  // (confirmBooking 안에서 다시 authoritative 재검증하지만, 캡처 전 여기서 걸러 불필요한 청구·환불 방지)
  const category = pkg.category;
  const preCheck = validateBookingConsents({
    category,
    participantDobs,
    bookingDate: date,
    checkedConsents: consents,
    guardian: guardian ?? null,
  });
  if (!preCheck.ok) {
    const minorBlocked =
      preCheck.reasons.includes('minor_guardian_required') ||
      preCheck.reasons.includes('guardian_incomplete');
    return NextResponse.json(
      {
        error: minorBlocked ? 'minor_guardian_required' : 'consent_invalid',
        reasons: preCheck.reasons,
        missingConsents: preCheck.missingConsents,
      },
      { status: 422 },
    );
  }

  // ── 5) 룸 배정 (멀티룸 union → 특정 룸 확정). 최종 overlap 재검사는 confirmBooking 락 안에서. ──
  let assignedRoomId: string | null = null;
  try {
    const rooms = await prisma.room.findMany({ where: { isActive: true }, select: { id: true } });
    for (const room of rooms) {
      const avail = await getAvailability(room.id, date);
      if (avail.some((s) => s.startTime === startTime && s.packageTier === tier)) {
        assignedRoomId = room.id;
        break;
      }
    }
  } catch (e) {
    if (e instanceof InvalidDateInputError) {
      return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    }
    console.error('[api/booking/confirm] room resolve failed:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
  if (!assignedRoomId) {
    return NextResponse.json({ error: 'slot_unavailable' }, { status: 409 });
  }

  // ── 6) mock PG 캡처 (최종 KRW 총액) ────────────────────────────────────────────────────────
  const gateway = getPaymentGateway(chosenPg);
  const capture = await gateway.capture({
    pg: chosenPg,
    amountKrw: finalTotalKrw,
    idempotencyKey: `${packageSlug}:${date}:${startTime}:${reservant.email}`,
    description: `KING STUDIO ${pkg.name}`,
  });
  if (!capture.ok) {
    return NextResponse.json({ error: 'payment_failed', reason: capture.reason }, { status: 402 });
  }

  const pricingSnapshot = { ...priceResult.basis, discounts: discount.snapshot };
  const packageSnapshot = {
    name: pkg.name,
    category: pkg.category,
    slotMinutes: pkg.slotMinutes,
    cdIncluded: pkg.cdIncluded,
  };
  const refundPolicySnapshot = currentRefundPolicySnapshot();

  // ── 7) confirmBooking (락+overlap 재검사+원자 쓰기+authoritative 동의/미성년 재검증) ───────────
  try {
    const result = await confirmBooking({
      roomId: assignedRoomId,
      date,
      startTime,
      packageId: pkg.id,
      category,
      headcount,
      songId: songId ?? null,
      customerEmail: reservant.email,
      customerName: reservant.name ?? null,
      customerPhone: reservant.phone ?? null,
      customerNationality: reservant.nationality ?? null,
      customerPassportName: reservant.passportName ?? null,
      userId,
      unitPriceKrw: priceResult.unitPriceKrw,
      priceTotalKrw: finalTotalKrw,
      returningDiscountKrw: discount.returningDiscountKrw,
      pricingSnapshot,
      packageSnapshot,
      refundPolicySnapshot,
      participants: participantDobs.map((d) => ({ dateOfBirth: d })),
      checkedConsents: consents,
      guardian: guardian ?? null,
      consentEvidence: {
        ip: clientIp(request),
        userAgent: request.headers.get('user-agent'),
        language: prismaLocale,
      },
      payment: {
        pg: chosenPg,
        amountKrw: finalTotalKrw,
        pgFeeKrw: capture.pgFeeKrw,
        pgTransactionId: capture.pgTransactionId,
      },
    });

    return NextResponse.json({
      ok: true,
      bookingId: result.bookingId,
      date,
      startTime: result.startTime,
      endTime: result.endTime,
      totalKrw: finalTotalKrw,
    });
  } catch (e) {
    // ── 8) 캡처 後 실패 → 자동환불 (PG 수수료 미공제) + audit_log(refund). 동기(23P01) 경로는
    //      Refund 레코드 없이 처리(§5.5-D) — 트랜잭션 롤백으로 Payment 자체가 없음.
    // SlotLockError = Redis lock itself was already held by the concurrent winner (lost the race
    // before ever reaching the DB); SlotConflictError = 23P01 DB exclusion-constraint loss; both are
    // the same "lost the concurrent race" outcome as BookingUnavailableError, just at different
    // layers (lib/slots/__tests__/concurrency.integration.test.ts asserts the loser can be either).
    const concurrentLost =
      e instanceof SlotLockError ||
      e instanceof SlotConflictError ||
      e instanceof BookingUnavailableError;
    const guardTripped =
      e instanceof MinorConsentRequiredError ||
      e instanceof ConsentRequiredError ||
      e instanceof InvalidConsentInputError;

    if (concurrentLost || guardTripped) {
      await autoRefund(chosenPg, capture.pgTransactionId, finalTotalKrw, {
        reason: concurrentLost ? 'concurrent_booking_lost' : 'consent_guard_post_capture',
        bookingDate: date,
        startTime,
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
    await autoRefund(chosenPg, capture.pgTransactionId, finalTotalKrw, {
      reason: 'internal_error',
      bookingDate: date,
      startTime,
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
