// Returning-member 10% discount ELIGIBILITY (Reconciliation §7 / PRD §5.9). Needs DB → lives here
// (not in the pure discount resolver). Eligible when: package flags returningDiscountEligible
// (experience Gold/Diamond/Premium) AND the booker is a logged-in member with ≥1 prior booking that
// is COMPLETED (session finished) and still has a PAID (non-refunded) payment. A fully refunded prior
// booking has no `paid` payment → excluded. The final discount amount + mutual-exclusion is decided by
// resolveDiscounts (lib/catalog/discount); this only returns the boolean it consumes.
//
// "완료·결제완료" = status 'completed' + a paid Payment (owner-confirmed interpretation, Stage D). A
// merely 'confirmed' (paid but session not yet held) booking does NOT yet grant returning status.

import { prisma } from '@/lib/db/prisma';

export async function resolveReturningEligibility(
  userId: string | null | undefined,
  packageReturningEligible: boolean,
): Promise<boolean> {
  if (!userId || !packageReturningEligible) return false;
  const priorCompleted = await prisma.booking.count({
    where: {
      userId,
      status: 'completed',
      payments: { some: { status: 'paid' } },
    },
  });
  return priorCompleted > 0;
}
