import { NextResponse } from 'next/server';

import {
  classifyConfirmBookingError,
  clientIp,
  executeConfirmedBooking,
  prepareBookingConfirm,
} from '@/lib/booking/confirmRequest';
import { prisma } from '@/lib/db/prisma';
import { type Locale, defaultLocale, locales } from '@/lib/i18n/routing';
import { inicisGateway } from '@/lib/payment';
import {
  claimPendingInicisOrder,
  getCompletedInicisOrder,
  putCompletedInicisOrder,
} from '@/lib/payment/inicisPending';

// KG이니시스 표준결제 2단 — 인증 결과 수신 → 승인(실청구) → 예약 원자 기록.
// ⚠ 위험 구역 작업 중 — 검증 필요 (§4 결제 webhook 계열 / Inicis_Slice_Spec §3).
//
// 이니시스가 고객 브라우저의 **최상위 폼 POST** 로 호출한다(크로스사이트 → 세션 쿠키 부재,
// userId 는 prepare 가 Redis 에 보관한 값 사용). 응답은 항상 303 redirect(체크아웃 화면) — JSON 아님.
//
// 방어선(순서 중요):
//   1) resultCode ≠ 0000 → 인증 실패 redirect (청구 없음)
//   2) authUrl·netCancelUrl 호스트가 *.inicis.com(https) 인지 검증 — SSRF 차단. 위조 URL 로는
//      승인도 망취소도 절대 호출하지 않는다.
//   3) done 레코드 → 멱등 성공 redirect (returnUrl 재전송·새로고침 흡수)
//   4) pending 원자 claim(GETDEL) — 없으면 만료 실패 redirect (청구 없음)
//   5) 저장 payload 재검증(공유 파이프라인) + 재계산 금액 == 저장 금액 — 승인 前이므로 실패 시 무청구
//   6) approve — 어댑터가 승인 응답 금액 == 서버 저장 금액 대조(위변조 시 자동 망취소)
//   7) 승인 성공 후 confirmBooking 실패(슬롯 경합 패배·동의 가드) → **netCancel 로 원복** + audit_log
export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

/** 승인·망취소 대상 URL 은 https + inicis.com(서브도메인 포함)만 허용 — SSRF·위조 차단(§4). */
function isInicisUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && /(^|\.)inicis\.com$/.test(u.hostname);
  } catch {
    return false;
  }
}

type RedirectTarget = { locale: Locale; packageSlug: string | null };

function resolveTarget(request: Request): RedirectTarget {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get('locale');
  const pkgParam = url.searchParams.get('package');
  return {
    locale: locales.includes(localeParam as Locale) ? (localeParam as Locale) : defaultLocale,
    packageSlug: pkgParam && SLUG_RE.test(pkgParam) ? pkgParam : null,
  };
}

function checkoutRedirect(
  request: Request,
  target: RedirectTarget,
  params: Record<string, string>,
): Response {
  const url = new URL(`/${target.locale}/booking/checkout`, request.url);
  if (target.packageSlug) url.searchParams.set('package', target.packageSlug);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, 303);
}

const fail = (request: Request, target: RedirectTarget, code: string) =>
  checkoutRedirect(request, target, { inicis: 'fail', code });

export async function POST(request: Request): Promise<Response> {
  const target = resolveTarget(request);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(request, target, 'payment_failed');
  }
  const field = (name: string): string => {
    const v = form.get(name);
    return typeof v === 'string' ? v : '';
  };

  const resultCode = field('resultCode');
  const authToken = field('authToken');
  const authUrl = field('authUrl');
  const netCancelUrl = field('netCancelUrl');
  const oid = field('orderNumber') || field('oid');

  // 1) 인증 실패 — 청구 없음. resultMsg 는 PII 가능성이 있어 로그·redirect 어디에도 싣지 않는다(§3.6).
  if (resultCode !== '0000') {
    return fail(request, target, 'payment_auth_failed');
  }
  if (!oid || !authToken || !authUrl || !netCancelUrl) {
    return fail(request, target, 'payment_failed');
  }

  // 2) SSRF 차단 — 위조 URL 로는 어떤 서버 호출도 하지 않는다(pending claim 前이라 레코드도 보존).
  if (!isInicisUrl(authUrl) || !isInicisUrl(netCancelUrl)) {
    console.error(`[inicis/return] non-inicis auth/netCancel url rejected (oid=${oid})`);
    return fail(request, target, 'payment_failed');
  }

  // 3) 멱등 — 이미 완료된 oid 의 재전송(새로고침 포함)은 성공 화면으로.
  const done = await getCompletedInicisOrder(oid);
  if (done) {
    return checkoutRedirect(request, target, {
      inicis: 'success',
      bookingId: done.bookingId,
      totalKrw: String(done.totalKrw),
    });
  }

  // 4) pending 원자 claim — 만료(TTL 900s 경과)면 청구 없이 종료.
  const pending = await claimPendingInicisOrder(oid);
  if (!pending || pending.payload.pg !== 'inicis') {
    return fail(request, target, 'payment_expired');
  }

  // 5) 승인 前 재검증 — 저장 payload 를 공유 파이프라인으로 다시 돌린다(슬롯·동의·가격 최신 상태).
  //    실패 시 아직 청구가 없으므로 망취소 불필요. 재계산 금액이 저장 금액과 다르면(결제창 체류 중
  //    가격·자격 변동) 고객 인증 금액과 어긋나므로 승인하지 않는다.
  const prep = await prepareBookingConfirm(pending.payload, pending.userId);
  if (!prep.ok) {
    return fail(request, target, prep.body.error);
  }
  const { ctx } = prep;
  if (ctx.finalTotalKrw !== pending.finalTotalKrw) {
    console.error(`[inicis/return] recomputed total drifted from prepared total (oid=${oid})`);
    return fail(request, target, 'payment_failed');
  }

  // 6) 승인 — 실청구. 어댑터가 응답 금액 == expectedAmountKrw 를 대조하고 불일치 시 자동 망취소(§4).
  const capture = await inicisGateway.approve({
    authToken,
    authUrl,
    netCancelUrl,
    oid,
    expectedAmountKrw: pending.finalTotalKrw,
  });
  if (!capture.ok) {
    return fail(request, target, 'payment_failed');
  }

  // 7) 예약 원자 기록 — 실패 시 환불 대신 netCancel 로 청구 원복(승인 직후 한정 취소 경로).
  try {
    const result = await executeConfirmedBooking(
      ctx,
      {
        pg: 'inicis',
        amountKrw: pending.finalTotalKrw,
        pgFeeKrw: capture.pgFeeKrw,
        pgTransactionId: capture.pgTransactionId,
      },
      { ip: clientIp(request), userAgent: request.headers.get('user-agent') },
    );

    await putCompletedInicisOrder(oid, {
      bookingId: result.bookingId,
      totalKrw: pending.finalTotalKrw,
    });
    return checkoutRedirect(request, target, {
      inicis: 'success',
      bookingId: result.bookingId,
      totalKrw: String(pending.finalTotalKrw),
    });
  } catch (e) {
    const kind = classifyConfirmBookingError(e);
    if (kind === 'unknown') console.error('[inicis/return] confirmBooking failed:', e);

    await inicisGateway.netCancel({ authToken, netCancelUrl, oid });
    await auditNetCancel(capture.pgTransactionId, {
      pg: 'inicis',
      amountKrw: pending.finalTotalKrw,
      oid,
      reason:
        kind === 'concurrent_lost'
          ? 'concurrent_booking_lost'
          : kind === 'guard_tripped'
            ? 'consent_guard_post_capture'
            : 'internal_error',
      bookingDate: ctx.date,
      startTime: ctx.startTime,
      ip: clientIp(request),
      userAgent: request.headers.get('user-agent'),
    });

    const code =
      kind === 'concurrent_lost'
        ? 'concurrent_booking_lost'
        : kind === 'guard_tripped'
          ? 'consent_invalid'
          : 'internal_error';
    return fail(request, target, code);
  }
}

// 승인 後 예약 실패 → 망취소 원복의 감사 기록 (§5.5-D 의 sync 자동환불 audit_log 와 대칭).
// method:'netcancel' 로 구분. 기록 실패는 삼켜서 redirect 를 막지 않는다(수동 대사용 콘솔만).
async function auditNetCancel(
  pgTransactionId: string,
  meta: Record<string, unknown> & { ip?: string | null; userAgent?: string | null },
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorAdminUserId: null, // system-triggered
        action: 'refund',
        targetType: 'payment',
        targetId: pgTransactionId,
        metadata: { method: 'netcancel', pgFeeDeducted: false, ...meta },
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });
  } catch (e) {
    console.error('[inicis/return] audit_log write failed:', e);
  }
}
