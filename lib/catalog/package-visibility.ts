import type { Locale, Package } from '@prisma/client';

// Detail-page gate. getPackageBySlug does NOT locale-filter (slug routing), so the page
// owns this rule: a package is viewable on a locale only if active AND locale ∈ languagesAvailable.
// (C11: ko-only rental/꿈길/워크샵 must 404 on /en, not just hide from the catalog list.)
export function isPackageViewable(pkg: Package | null, locale: Locale): pkg is Package {
  if (!pkg) return false;
  if (!pkg.isActive) return false;
  return pkg.languagesAvailable.includes(locale);
}
