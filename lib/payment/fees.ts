// 💰 Money-critical (§4 danger zone — payment). PURE PG-fee calculator (no prisma, no I/O) so the
// fee math is trivially unit-testable in the cloud vitest harness. Rates per PRD §5.5:
//   • KG이니시스 (inicis): ~3.0%
//   • PayPal:              ~4.4% + ₩560 fixed
// The fee is what the PG deducts from the KRW charge; it is stored on Payment.pgFeeKrw and used as
// the basis for refund calculations (PRD §5.5 "PG 수수료 (환불 계산 기준)"). Exact contracted rates
// are confirmed at real-PG onboarding — these constants are the MVP/mock defaults and the ONLY place
// the rates live, so swapping them later is a one-file change.

import type { Pg } from '@prisma/client';

// Basis points keep the percentage integer-exact (no float 0.030). 300 bp = 3.00%, 440 bp = 4.40%.
export const PG_FEE_TABLE: Record<Pg, { rateBp: number; fixedKrw: number }> = {
  inicis: { rateBp: 300, fixedKrw: 0 },
  paypal: { rateBp: 440, fixedKrw: 560 },
};

function assertPositiveInt(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer (got ${value})`);
  }
}

// PG fee in whole won. `floor` on the percentage part is the conservative direction for a deduction
// snapshot (never overstate what the business absorbs); the fixed part is added after flooring.
// amountKrw is the KRW charge (== Booking.priceTotalKrw at capture time).
export function computePgFeeKrw(pg: Pg, amountKrw: number): number {
  assertPositiveInt(amountKrw, 'amountKrw');
  const { rateBp, fixedKrw } = PG_FEE_TABLE[pg];
  return Math.floor((amountKrw * rateBp) / 10_000) + fixedKrw;
}
