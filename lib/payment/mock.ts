// MOCK payment gateway (Stage D). Completes the checkout flow without real PG credentials: capture
// always succeeds and returns a synthetic pgTransactionId; refund always succeeds. Fee is computed by
// the real fee table (./fees) so downstream snapshots/refund math exercise production logic. When
// KG이니시스 / PayPal onboarding completes (§9), add inicis.ts / paypal.ts implementing PaymentGateway
// and switch getPaymentGateway (./index) — nothing else changes.
//
// NOTE: intentionally has no failure injection in the happy path; concurrent-loss is triggered by
// confirmBooking's 23P01 (a DB event), not by the gateway. Tests can substitute their own PaymentGateway.

import { randomUUID } from 'node:crypto';
import { computePgFeeKrw } from './fees';
import type {
  CaptureInput,
  CaptureResult,
  PaymentGateway,
  RefundInput,
  RefundResult,
} from './types';

export class MockPaymentGateway implements PaymentGateway {
  async capture(input: CaptureInput): Promise<CaptureResult> {
    if (!Number.isInteger(input.amountKrw) || input.amountKrw <= 0) {
      return { ok: false, reason: 'invalid_amount' };
    }
    return {
      ok: true,
      pgTransactionId: `mock_${input.pg}_${randomUUID()}`,
      pgFeeKrw: computePgFeeKrw(input.pg, input.amountKrw),
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!input.pgTransactionId) return { ok: false, reason: 'missing_transaction' };
    return { ok: true, pgRefundId: `mockref_${input.pg}_${randomUUID()}` };
  }
}
