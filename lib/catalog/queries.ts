import { prisma } from '@/lib/db/prisma';
import type { Locale, Package, PackageCategory } from '@prisma/client';

// Catalog read layer. Locale filter is the §5/C11 rule: a package shows on a locale's site
// only if that locale ∈ languagesAvailable (so ko-only rental/꿈길/워크샵 auto-hide abroad).
export async function listPackages(opts: {
  category?: PackageCategory;
  locale: Locale;
  activeOnly?: boolean;
}): Promise<Package[]> {
  const { category, locale, activeOnly = true } = opts;
  return prisma.package.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(category ? { category } : {}),
      languagesAvailable: { has: locale },
    },
    orderBy: { displayOrder: 'asc' },
  });
}

// No locale filter — slug routing. A locale-gated detail page checks languagesAvailable itself.
export async function getPackageBySlug(slug: string): Promise<Package | null> {
  return prisma.package.findUnique({ where: { slug } });
}
