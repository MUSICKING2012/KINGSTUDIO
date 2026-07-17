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
