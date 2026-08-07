// 예약 확정 요청의 공유 검증·가격 파이프라인 (Payment_Inicis_Slice_Spec §3).
//
// 원래 /api/booking/confirm 라우트 안에 있던 1)~5) 단계(입력 검증 → 패키지·가격 authoritative
// 재로딩 → 재방문 할인 → 캡처 前 동의/미성년 프리체크 → 룸 배정)를 함수로 추출했다.
// 소비처는 두 곳이며 **중복 구현 금지**(진실 이중화 방지):
//   • POST /api/booking/confirm        — Mock 동기 캡처 경로 (기존 e2e가 동작을 보호)
//   • POST /api/payment/inicis/prepare — 이니시스 결제창 진입 前 검증 + 금액 스냅샷
//   • POST /api/payment/inicis/return  — 승인 후 재검증(저장 payload 재실행) + 예약 원자 기록
//
// ⚠ 위험 구역(§4 결제): 금액은 항상 서버 재계산(클라 불신). auth() 는 여기서 호출하지 않는다 —
// 이니시스 return 은 크로스사이트 최상위 POST 라 세션 쿠키(SameSite)가 실리지 않으므로,
// userId 는 호출부가 결정해 주입한다(confirm/prepare = auth(), return = Redis 저장값).

import { resolveReturningEligibility } from '@/lib/booking/eligibility';
import { currentRefundPolicySnapshot } from '@/lib/booking/refundPolicy';
import { resolveDiscounts } from '@/lib/catalog/discount';
import { isPackageBookableOnline, isPackageViewable } from '@/lib/catalog/package-visibility';
import { computePackageTotal } from '@/lib/catalog/pricing';
import { getPackageBySlug } from '@/lib/catalog/queries';
import { validateBookingConsents } from '@/lib/consent/confirm';
import type { ConsentType, GuardianInfo } from '@/lib/consent/step3';
import { prisma } from '@/lib/db/prisma';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { type Locale, locales } from '@/lib/i18n/routing';
import { SlotLockError } from '@/lib/redis/slotLock';
import { getAvailability } from '@/lib/slots/availability';
import {
  BookingUnavailableError,
  type ConfirmBookingResult,
  ConsentRequiredError,
  InvalidConsentInputError,
  MinorConsentRequiredError,
  SlotConflictError,
  confirmBooking,
} from '@/lib/slots/confirmBooking';
import { resolvePackageTier } from '@/lib/slots/publicAvailability';
import { InvalidDateInputError } from '@/lib/slots/time';
import { isWithinBookingWindow } from '@/lib/slots/window';
import type { Package, Locale as PrismaLocale } from '@prisma/client';
import type { Pg } from '@prisma/client';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}:\d{2}$/;
const PGS: Pg[] = ['inicis', 'paypal'];

export type ConfirmRequestBody = {
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

export type ConfirmFailure = {
  ok: false;
  status: number;
  body: { error: string } & Record<string, unknown>;
};

export type ConfirmContext = {
  packageSlug: string;
  date: string;
  startTime: string;
  headcount: number;
  songId: string | null;
  reservant: NonNullable<ConfirmRequestBody['reservant']> & { email: string };
  participantDobs: string[];
  guardian: GuardianInfo | null;
  consents: ConsentType[];
  pg: Pg;
  locale: Locale;
  prismaLocale: PrismaLocale;
  userId: string | null;
  pkg: Package;
  category: Package['category'];
  priceResult: ReturnType<typeof computePackageTotal>;
  discount: ReturnType<typeof resolveDiscounts>;
  finalTotalKrw: number;
  assignedRoomId: string;
};

export function clientIp(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? null;
  return request.headers.get('x-real-ip');
}

/**
 * 검증 + authoritative 가격 재계산 + 룸 배정. 성공 시 캡처/승인에 필요한 전 컨텍스트를 반환한다.
 * 실패는 기존 confirm 라우트와 동일한 status·body 계약(e2e 보호 대상 — 변경 금지).
 */
export async function prepareBookingConfirm(
  body: ConfirmRequestBody,
  userId: string | null,
): Promise<ConfirmFailure | { ok: true; ctx: ConfirmContext }> {
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
    return { ok: false, status: 400, body: { error: 'invalid_params' } };
  }
  if (participantDobs.length !== headcount || headcount < 1) {
    return { ok: false, status: 400, body: { error: 'headcount_mismatch' } };
  }
  if (!isWithinBookingWindow(date)) {
    return { ok: false, status: 400, body: { error: 'out_of_window' } };
  }

  const prismaLocale = toPrismaLocale(localeParam as Locale);
  const chosenPg = pg as Pg;

  // ── 2) 패키지·가격 authoritative 재로딩 (클라 금액 불신) ────────────────────────────────────
  const pkg = await getPackageBySlug(packageSlug);
  if (!isPackageViewable(pkg, prismaLocale)) {
    return { ok: false, status: 404, body: { error: 'package_not_available' } };
  }
  // bookingFlow is the AUTHORITATIVE web-bookability gate (PRD §5.3 group exception, 2026-07-17):
  // b2b_quote (Making Class / 꿈길 / 워크샵) = B2B inquiry → admin quote (§5.8-A③), never web/API
  // direct payment. Checked before the name-based tier fallback so the semantic field wins even
  // if a b2b package ever carries a grid-tier name.
  if (!isPackageBookableOnline(pkg)) {
    return { ok: false, status: 400, body: { error: 'not_web_bookable' } };
  }
  const tier = resolvePackageTier(pkg.name);
  if (!tier) {
    return { ok: false, status: 400, body: { error: 'not_slot_bookable' } };
  }

  let priceResult: ReturnType<typeof computePackageTotal>;
  try {
    priceResult = computePackageTotal(pkg, headcount);
  } catch {
    return { ok: false, status: 400, body: { error: 'headcount_out_of_range' } };
  }

  // ── 3) 재방문 할인 자격 → 최종 총액 (§5.9) ────────────────────────────────────────────────
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
    return {
      ok: false,
      status: 422,
      body: {
        error: minorBlocked ? 'minor_guardian_required' : 'consent_invalid',
        reasons: preCheck.reasons,
        missingConsents: preCheck.missingConsents,
      },
    };
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
      return { ok: false, status: 400, body: { error: 'invalid_date' } };
    }
    console.error('[booking/confirmRequest] room resolve failed:', e);
    return { ok: false, status: 500, body: { error: 'internal_error' } };
  }
  if (!assignedRoomId) {
    return { ok: false, status: 409, body: { error: 'slot_unavailable' } };
  }

  return {
    ok: true,
    ctx: {
      packageSlug,
      date,
      startTime,
      headcount,
      songId: songId ?? null,
      reservant: reservant as ConfirmContext['reservant'],
      participantDobs,
      guardian: guardian ?? null,
      consents,
      pg: chosenPg,
      locale: localeParam as Locale,
      prismaLocale,
      userId,
      pkg,
      category,
      priceResult,
      discount,
      finalTotalKrw,
      assignedRoomId,
    },
  };
}

/**
 * 캡처(또는 이니시스 승인) 성공 후 예약을 원자 기록한다 — 스냅샷 조립 + confirmBooking 호출.
 * confirmBooking 의 에러(슬롯 경합·동의 가드)는 그대로 전파하며, 원복(환불/망취소)은 호출부 책임.
 */
export async function executeConfirmedBooking(
  ctx: ConfirmContext,
  payment: { pg: Pg; amountKrw: number; pgFeeKrw: number; pgTransactionId: string | null },
  evidence: { ip: string | null; userAgent: string | null },
): Promise<ConfirmBookingResult> {
  const pricingSnapshot = { ...ctx.priceResult.basis, discounts: ctx.discount.snapshot };
  const packageSnapshot = {
    name: ctx.pkg.name,
    category: ctx.pkg.category,
    slotMinutes: ctx.pkg.slotMinutes,
    cdIncluded: ctx.pkg.cdIncluded,
  };
  const refundPolicySnapshot = currentRefundPolicySnapshot();

  return confirmBooking({
    roomId: ctx.assignedRoomId,
    date: ctx.date,
    startTime: ctx.startTime,
    packageId: ctx.pkg.id,
    category: ctx.category,
    headcount: ctx.headcount,
    songId: ctx.songId,
    customerEmail: ctx.reservant.email,
    customerName: ctx.reservant.name ?? null,
    customerPhone: ctx.reservant.phone ?? null,
    customerNationality: ctx.reservant.nationality ?? null,
    customerPassportName: ctx.reservant.passportName ?? null,
    userId: ctx.userId,
    unitPriceKrw: ctx.priceResult.unitPriceKrw,
    priceTotalKrw: ctx.finalTotalKrw,
    returningDiscountKrw: ctx.discount.returningDiscountKrw,
    pricingSnapshot,
    packageSnapshot,
    refundPolicySnapshot,
    participants: ctx.participantDobs.map((d) => ({ dateOfBirth: d })),
    checkedConsents: ctx.consents,
    guardian: ctx.guardian,
    consentEvidence: {
      ip: evidence.ip,
      userAgent: evidence.userAgent,
      language: ctx.prismaLocale,
    },
    payment,
  });
}

/**
 * confirmBooking 실패 분류 — 두 경로(Mock 자동환불 / 이니시스 망취소)가 같은 판정을 공유한다.
 * SlotLockError = Redis 락 선점 패배, SlotConflictError = 23P01 exclusion 패배,
 * BookingUnavailableError = 락 안 재검사 패배 — 셋 다 동시성 패배(§5.5-D).
 */
export function classifyConfirmBookingError(
  e: unknown,
): 'concurrent_lost' | 'guard_tripped' | 'unknown' {
  if (
    e instanceof SlotLockError ||
    e instanceof SlotConflictError ||
    e instanceof BookingUnavailableError
  ) {
    return 'concurrent_lost';
  }
  if (
    e instanceof MinorConsentRequiredError ||
    e instanceof ConsentRequiredError ||
    e instanceof InvalidConsentInputError
  ) {
    return 'guard_tripped';
  }
  return 'unknown';
}
