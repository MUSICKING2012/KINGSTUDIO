import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';

// §5.7 / §4 danger zone — license-display gate.
// The song-catalog & download pages must NOT show license-attribution badges in MVP. An admin
// global toggle (`settings.license_display_enabled`) turns it on later; even then only songs whose
// per-type license is verified are shown (the read layer never hides the data — the SCREEN gates
// display). Fail-safe: only the literal boolean true enables it; an absent row, false, or any
// truthy-but-not-true value resolves to false. Showing attribution without proof is a
// false-advertising risk, so the default is OFF.

export function isLicenseDisplayEnabled(value: Prisma.JsonValue | null | undefined): boolean {
  return value === true;
}

export async function getLicenseDisplayEnabled(): Promise<boolean> {
  const row = await prisma.setting.findUnique({ where: { key: 'license_display_enabled' } });
  return isLicenseDisplayEnabled(row?.value ?? null);
}
