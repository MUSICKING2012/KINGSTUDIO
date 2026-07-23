import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CategoryCatalog } from '@/components/catalog/category-catalog';

// CategoryIA refactor: per-category entry point. force-dynamic (DB prices + display FX at request
// time — CLAUDE.md §6); the shared CategoryCatalog does the locale exposure gate (data-driven 404).
// Rental packages (1Hour/1Pro) are ko-only (CLAUDE.md §5), so this route 404s in en/ja/zh-* — which
// is why /rental is excluded from the sitemap (STEP 6).
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale,
    namespace: 'packages.catalog.categories.rental',
  });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default function RentalPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return <CategoryCatalog category="rental" locale={locale} />;
}
