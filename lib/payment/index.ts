// Payment-gateway resolver — the ONE place that decides which concrete gateway is live. Today every
// PG resolves to the mock (Stage D flow completion). Real adapters (inicis.ts / paypal.ts) plug in
// here later without touching callers. Keeping this a function (not a module-level singleton) leaves
// room for per-request/per-PG config injection when real credentials arrive.

import { MockPaymentGateway } from './mock';
import type { PaymentGateway } from './types';

const mock = new MockPaymentGateway();

export function getPaymentGateway(_pg: unknown): PaymentGateway {
  // TODO(§9 pre-flight): return inicis/paypal adapter once 가맹 심사 완료 + credentials in secret manager.
  return mock;
}

export type {
  PaymentGateway,
  CaptureInput,
  CaptureResult,
  RefundInput,
  RefundResult,
  PrepareCheckoutInput,
  PreparedCheckout,
  ApproveInput,
  RedirectPaymentGateway,
} from './types';
// redirect(인증창) 계열은 capture 심과 별개 계약 — 이니시스 라우트가 직접 소비한다(spec §3).
export { inicisGateway, InicisGateway, type NetCancelInput } from './inicis';
export { computePgFeeKrw, PG_FEE_TABLE } from './fees';
