import { randomUUID } from 'node:crypto';
import { validateBookingConsents } from '@/lib/consent/confirm';
import type { ConsentType, GuardianInfo, PackageCategory } from '@/lib/consent/step3';
import { prisma } from '@/lib/db/prisma';
import { withSlotLock } from '@/lib/redis/slotLock';
import { Prisma } from '@prisma/client';
import type { Locale, Pg } from '@prisma/client';
import { getAvailability } from './availability';
import type { PackageTier } from './constants';
import { assertDateString, toDbDate, toTimeDate } from './time';

export class BookingUnavailableError extends Error {
  constructor(roomId: string, date: string, packageId: string) {
    super(`slot unavailable: room=${roomId} date=${date} package=${packageId}`);
    this.name = 'BookingUnavailableError';
  }
}

/// DB exclusion(bookings_no_overlap, Postgres 23P01)이 동시 트랜잭션의 선커밋으로 슬롯을 빼앗겨
/// create를 거부할 때(Redis 락이 직렬화 못 한 희귀 TOCTOU, §5.3 ② 최종 안전망). 이 에러와
/// BookingUnavailableError 둘 다 concurrent_booking_lost 환불 트리거(§5.3-D)이며, 환불은 호출부
/// (S3.4b)가 결정한다. NOTE: Prisma가 exclusion 위반을 PrismaClientUnknownRequestError로 싸고
/// .code가 없어 message의 '23P01' 리터럴로 매칭(2026-06-30 probe 실측). 현재 exclusion 제약은
/// 하나뿐이라 23P01=이 슬롯겹침; 제약이 늘면 제약명으로 좁힐 것.
export class SlotConflictError extends Error {
  readonly roomId: string;
  readonly date: string;
  readonly packageId: string;
  constructor(roomId: string, date: string, packageId: string) {
    super(`slot conflict (exclusion 23P01): room=${roomId} date=${date} package=${packageId}`);
    this.name = 'SlotConflictError';
    this.roomId = roomId;
    this.date = date;
    this.packageId = packageId;
  }
}

// 하드제약 #4 — 미성년(만16<) + 유효 보호자 동의 부재. confirmBooking의 authoritative 가드가 던지는
// 우회 불가 에러(클라/route 프리체크를 우회해 직접 호출해도 트랜잭션 진입 전 여기서 차단). 결제가
// 이미 캡처됐다면 호출부가 자동환불한다(§5.5-D).
export class MinorConsentRequiredError extends Error {
  readonly reasons: string[];
  constructor(reasons: string[]) {
    super(`minor participant requires valid guardian consent (reasons: ${reasons.join(',')})`);
    this.name = 'MinorConsentRequiredError';
    this.reasons = reasons;
  }
}

// 필수 동의(결제약관·이용범위 등) 누락 — 서버 재검증 실패(§5.5/§5.7). 마찬가지로 트랜잭션 진입 전 차단.
export class ConsentRequiredError extends Error {
  readonly missing: string[];
  constructor(missing: string[]) {
    super(`required consents missing: ${missing.join(',')}`);
    this.name = 'ConsentRequiredError';
    this.missing = missing;
  }
}

// 생년월일 등 구조적으로 검증 불가한 입력. 우회 시도의 흔한 형태(빈 DOB) 포함 → 항상 거부.
export class InvalidConsentInputError extends Error {
  constructor() {
    super('participant date-of-birth input is missing or malformed');
    this.name = 'InvalidConsentInputError';
  }
}

export type ConfirmBookingParticipant = { dateOfBirth: string }; // "YYYY-MM-DD" KST

export type ConfirmBookingInput = {
  roomId: string;
  date: string; // "YYYY-MM-DD" KST 벽시계 (호출자가 보장)
  startTime: string; // "HH:MM:00" KST — 사용자가 선택한 슬롯
  packageId: string;
  category: PackageCategory; // 동의 필수항목 해석(rental 추가항목)용
  headcount: number;
  songId?: string | null;

  // --- 고객 연락 스냅샷 (게스트도 동작; 이메일은 NOT NULL) ---
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerNationality?: string | null;
  customerPassportName?: string | null;
  userId?: string | null; // 로그인 회원이면 set (재방문 자격/링크)

  // --- 💰 가격 스냅샷 (§3.2) — 호출부가 할인엔진 적용 후 동결값 전달 ---
  unitPriceKrw: number;
  priceTotalKrw: number; // 최종 청구액(할인 반영)
  returningDiscountKrw?: number | null; // §5.9 재방문 10%(적용 시), 미적용 null
  pricingSnapshot: object; // {basis, discounts, ...}
  packageSnapshot: object;
  refundPolicySnapshot: object;

  // --- 동의/참가자 (우회 불가 서버 재검증 대상) ---
  participants: ConfirmBookingParticipant[]; // headcount만큼, 전원 DOB
  checkedConsents: ConsentType[]; // 사용자가 동의한 전체 항목(필수+선택+payment+guardian)
  guardian?: GuardianInfo | null;

  // --- 동의 증거 메타(§5.5: 타임스탬프+IP+UA, 타임스탬프는 DB default) ---
  consentEvidence: { ip?: string | null; userAgent?: string | null; language: Locale };

  // 결제 정보 (캡처 후 호출 — PG 콜백이 채움). amountKrw는 priceTotalKrw와 독립(할인 대비).
  // status='paid'·paidAt은 입력이 아니라 confirmBooking이 강제(캡처 후이므로 항상 paid).
  payment: {
    pg: Pg;
    amountKrw: number;
    pgFeeKrw?: number; // default 0
    pgTransactionId?: string | null; // @@unique; null 허용
  };
};

export type ConfirmBookingResult = {
  bookingId: string;
  paymentId: string;
  startTime: string; // "HH:MM:00"
  endTime: string; // "HH:MM:00"
};

export async function confirmBooking(input: ConfirmBookingInput): Promise<ConfirmBookingResult> {
  assertDateString(input.date);
  const {
    roomId,
    date,
    startTime,
    packageId,
    category,
    headcount,
    songId,
    customerEmail,
    customerName,
    customerPhone,
    customerNationality,
    customerPassportName,
    userId,
    unitPriceKrw,
    priceTotalKrw,
    returningDiscountKrw,
    pricingSnapshot,
    packageSnapshot,
    refundPolicySnapshot,
    participants,
    checkedConsents,
    guardian,
    consentEvidence,
    payment,
  } = input;

  // ── 우회 불가 서버 가드 (하드제약 #4 / §5.5·§5.7) ──────────────────────────────────────────
  // 트랜잭션·슬롯락 진입 전, 클라가 보낸 값을 절대 신뢰하지 않고 DOB로 미성년을 서버 재계산해 검증.
  // 이 함수를 클라/route 프리체크를 우회해 직접 호출해도 여기서 먼저 차단된다.
  const dobs = participants.map((p) => p.dateOfBirth);
  const consentCheck = validateBookingConsents({
    category,
    participantDobs: dobs,
    bookingDate: date,
    checkedConsents,
    guardian,
  });
  if (!consentCheck.ok) {
    if (consentCheck.reasons.includes('dob_invalid')) throw new InvalidConsentInputError();
    if (
      consentCheck.reasons.includes('minor_guardian_required') ||
      consentCheck.reasons.includes('guardian_incomplete')
    ) {
      throw new MinorConsentRequiredError(consentCheck.reasons);
    }
    throw new ConsentRequiredError(consentCheck.missingConsents);
  }
  const { hasMinor, participantIsMinor } = consentCheck;

  // 실제로 기록할 동의: 서버가 미성년 아니라고 판정하면 guardian 행은 쓰지 않는다(클라가 잘못 보내도).
  const consentsToWrite = checkedConsents.filter((c) => c !== 'guardian' || hasMinor);

  return withSlotLock(roomId, date, async () => {
    // Resolve packageTier from DB so slot matching is by (startTime + tier), not startTime alone.
    const pkg = await prisma.package.findUniqueOrThrow({
      where: { id: packageId },
      select: { name: true },
    });
    const packageTier = pkg.name as PackageTier;

    const available = await getAvailability(roomId, date);
    const slot = available.find((s) => s.startTime === startTime && s.packageTier === packageTier);

    if (!slot) {
      throw new BookingUnavailableError(roomId, date, packageId);
    }

    // Booking(confirmed) + Consent(append-only, N) + BookingParticipant(N) + Payment(paid)를
    // 단일 인터랙티브 트랜잭션으로 원자 기록(§5.5). getAvailability는 트랜잭션 밖(위)에서 이미 수행.
    // 23P01 catch는 콜백 안: 변환된 SlotConflictError가 throw되면 트랜잭션 전체 롤백 → 동의/참가자/
    // 결제 어느 것도 커밋되지 않는다(부분 기록 없음). append-only 원칙: consent는 create만(UPDATE/DELETE 없음).
    // ⚠ confirmed 자동화 체인(§5.8-A②) 발화는 커밋 성공 후(Stage 7)에서 트리거 — 트랜잭션 안에서 쏘지 않는다.
    let result: { bookingId: string; paymentId: string };
    try {
      result = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.create({
          data: {
            roomId,
            date: toDbDate(date), // @db.Date carrier
            startTime: toTimeDate(slot.startTime),
            endTime: toTimeDate(slot.endTime),
            packageId,
            headcount,
            songId: songId ?? null,
            customerEmail,
            customerName: customerName ?? null,
            customerPhone: customerPhone ?? null,
            customerNationality: customerNationality ?? null,
            customerPassportName: customerPassportName ?? null,
            userId: userId ?? null,
            unitPriceKrw,
            priceTotalKrw,
            returningDiscountKrw: returningDiscountKrw ?? null,
            pricingSnapshot,
            packageSnapshot,
            refundPolicySnapshot,
            status: 'confirmed',
          },
          select: { id: true },
        });

        // 동의 기록 — append-only(create만). 각 논리적 동의는 자체 consentGroupId로 시작(철회 시
        // 같은 그룹에 false row 추가, 이 stage 범위 밖). guardian 행은 extraData에 보호자 정보 +
        // 참가자 링크용 id 확보.
        let guardianConsentId: string | null = null;
        for (const consentType of consentsToWrite) {
          const row = await tx.consent.create({
            data: {
              bookingId: booking.id,
              userId: userId ?? null,
              consentType,
              consentGroupId: randomUUID(),
              consented: true,
              ip: consentEvidence.ip ?? null,
              userAgent: consentEvidence.userAgent ?? null,
              language: consentEvidence.language,
              extraData:
                consentType === 'guardian' && guardian
                  ? {
                      name: guardian.name,
                      relation: guardian.relation,
                      contact: guardian.contact,
                      email: guardian.email,
                    }
                  : undefined,
            },
            select: { id: true },
          });
          if (consentType === 'guardian') guardianConsentId = row.id;
        }

        // 참가자 스냅샷 — isMinor는 서버 재계산값(participantIsMinor), 미성년이면 guardianConsentId 링크.
        for (let i = 0; i < participants.length; i++) {
          await tx.bookingParticipant.create({
            data: {
              bookingId: booking.id,
              dateOfBirth: toDbDate(participants[i].dateOfBirth),
              isMinor: participantIsMinor[i],
              guardianConsentId: participantIsMinor[i] ? guardianConsentId : null,
            },
          });
        }

        const pmt = await tx.payment.create({
          data: {
            bookingId: booking.id,
            pg: payment.pg,
            amountKrw: payment.amountKrw,
            pgFeeKrw: payment.pgFeeKrw ?? 0,
            pgTransactionId: payment.pgTransactionId ?? null,
            status: 'paid',
            paidAt: new Date(),
          },
          select: { id: true },
        });

        return { bookingId: booking.id, paymentId: pmt.id };
      });
    } catch (e) {
      // DB exclusion(bookings_no_overlap, 23P01): Redis 락이 직렬화 못 한 동시 커밋에 슬롯을
      // 빼앗김 → 환불용 타입 에러로 표면화(§5.3-D). 트랜잭션 콜백 throw는 롤백 후 전파됨.
      // 그 외 에러는 원형 그대로 전파.
      if (e instanceof Prisma.PrismaClientUnknownRequestError && e.message.includes('23P01')) {
        throw new SlotConflictError(roomId, date, packageId);
      }
      throw e;
    }

    return {
      bookingId: result.bookingId,
      paymentId: result.paymentId,
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
  });
}
