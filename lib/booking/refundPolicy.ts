// Frozen refund-policy snapshot (§5.3 환불 정책 3구간). Stored verbatim into Booking.refundPolicySnapshot
// at payment so an admin policy change never applies retroactively (§5.5 "결제 시점의 정책을 예약
// 레코드에 스냅샷으로 저장하여 소급 적용 방지"). PURE — no I/O. Bump REFUND_POLICY_VERSION whenever the
// tiers change; historical bookings keep the version they were sold under.

export const REFUND_POLICY_VERSION = '2026-07-18';

export function currentRefundPolicySnapshot() {
  return {
    version: REFUND_POLICY_VERSION,
    // A. 고객 변심 취소 — 시점별 환불율 (PG 수수료 공제)
    changeOfMind: [
      { when: 'gte_3d', refundPct: 100, pgFeeDeducted: true },
      { when: 'd_2', refundPct: 80, pgFeeDeducted: true },
      { when: 'd_1', refundPct: 50, pgFeeDeducted: true },
      { when: 'same_day_or_no_show', refundPct: 0, pgFeeDeducted: false },
    ],
    // B. 사업자 귀책 / C. 천재지변 / D. 시스템 더블부킹 경합 — 100% 환불, PG 수수료 사업자 흡수
    businessFault: { refundPct: 100, pgFeeDeducted: false },
    forceMajeure: { refundPct: 100, pgFeeDeducted: false },
    concurrentBookingLost: { refundPct: 100, pgFeeDeducted: false },
    // 다운로드 1회 이상 발생 예약은 환불 최대 50% (사업자 귀책·천재지변·시스템 제외)
    postDownloadCapPct: 50,
  };
}
