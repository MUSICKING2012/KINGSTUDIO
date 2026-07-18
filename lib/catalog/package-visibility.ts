import { BookingFlow, type Locale, type Package } from '@prisma/client';

// Detail-page gate. getPackageBySlug does NOT locale-filter (slug routing), so the page
// owns this rule: a package is viewable on a locale only if active AND locale ∈ languagesAvailable.
// (C11: ko-only rental/꿈길/워크샵 must 404 on /en, not just hide from the catalog list.)
export function isPackageViewable(pkg: Package | null, locale: Locale): pkg is Package {
  if (!pkg) return false;
  if (!pkg.isActive) return false;
  return pkg.languagesAvailable.includes(locale);
}

// Web-bookability gate (PRD §5.3 group-slot exception, owner decision 2026-07-17): only
// bookingFlow=instant_payment may enter the self-serve booking flow or the confirm API.
// b2b_quote packages (Making Class / 꿈길 / 워크샵) go through B2B inquiry → admin quote
// (§5.8-A③) instead. This semantic field is the authoritative gate — the name-based slot-grid
// check (resolvePackageTier) stays only as a structural fallback, because it silently breaks
// the moment a package is renamed or its flow is changed via future admin package management.
export function isPackageBookableOnline(pkg: Pick<Package, 'bookingFlow'>): boolean {
  return pkg.bookingFlow === BookingFlow.instant_payment;
}
