// Payment-gateway adapter boundary (§5.5 결제 캡처 모델). Stage D ships a MOCK/sandbox gateway to
// complete the booking flow end-to-end; real KG이니시스 / PayPal credentials are injected later
// (§9 pre-flight — 가맹 심사 미완) by swapping the implementation behind THIS interface. The rest of
// the app (checkout route, confirmBooking wiring) depends only on these types, never on a concrete PG.
//
// MVP = synchronous capture only (PRD §5.5 "즉시승인(동기 캡처) 수단만 슬롯을 확정한다"): the gateway
// captures the KRW charge, then confirmBooking writes Booking(confirmed)+Payment(paid) atomically.
// Async settlement (가상계좌/휴대폰) with webhook re-check is out of this stage's scope.

import type { Pg } from '@prisma/client';

// A capture attempt. amountKrw is the FINAL charged total (post-discount), always KRW (single-currency
// billing, 하드제약 #2). idempotencyKey lets a retried capture avoid double-charging (mock ignores it
// beyond echoing; real PGs require it).
export type CaptureInput = {
  pg: Pg;
  amountKrw: number;
  idempotencyKey: string;
  // reference only — surfaced to the PG for the payer's statement; never card data (§3.6).
  description?: string;
};

export type CaptureResult =
  | { ok: true; pgTransactionId: string; pgFeeKrw: number }
  | { ok: false; reason: string };

// A refund against a prior capture. Used by the 23P01 concurrent-loss auto-refund path (§5.5-D):
// PG-fee is NOT deducted (business absorbs), so refundAmountKrw == the captured amount there.
export type RefundInput = {
  pg: Pg;
  pgTransactionId: string;
  amountKrw: number;
  reason: string;
};

export type RefundResult = { ok: true; pgRefundId: string } | { ok: false; reason: string };

// The single seam every payment integration implements. `getPaymentGateway` (./index) returns the
// active one — mock today, inicis/paypal adapters later — so callers never branch on `pg` themselves.
export interface PaymentGateway {
  capture(input: CaptureInput): Promise<CaptureResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}

// ── Redirect(인증창) 계열 2단 계약 (Inicis_Slice_Spec §3, 오너 확정 2026-08-07) ──────────────
// KG이니시스 표준결제(INIStdPay)는 브라우저 인증창 → returnUrl POST → 서버 승인의 3단 흐름이라
// 단일 capture 로 시작할 수 없다. prepareCheckout 이 결제창 파라미터(서명 포함)를 만들고,
// approve 가 인증 결과를 승인(=실청구)한다. Mock·PayPal 은 기존 capture 경로를 유지한다.

export type PrepareCheckoutInput = {
  oid: string; // 주문번호 = 예약 draft 키 (idempotency — 재시도 시 동일 oid)
  amountKrw: number;
  goodName: string;
  buyerName: string;
  buyerEmail: string;
  returnUrl: string;
  closeUrl: string;
};

// 클라이언트가 그대로 폼 제출/SDK 호출에 쓰는 값. 서버 전용 키(signKey)는 절대 포함 금지(§3.7).
export type PreparedCheckout = {
  kind: 'inicis-stdpay';
  scriptUrl: string;
  formFields: Record<string, string>;
};

export type ApproveInput = {
  authToken: string;
  authUrl: string;
  netCancelUrl: string;
  oid: string;
  // 금액 위변조 검증 기준 — 서버 보관 예약 스냅샷 금액(클라이언트 값 불신, §4 위험 구역).
  expectedAmountKrw: number;
};

export interface RedirectPaymentGateway {
  prepareCheckout(input: PrepareCheckoutInput): PreparedCheckout;
  approve(input: ApproveInput): Promise<CaptureResult>;
}
