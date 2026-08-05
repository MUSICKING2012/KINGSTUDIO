import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CategoryCatalog } from '@/components/catalog/category-catalog';

// 시퀀스 5d-1 (결정 ① = A 리네임): 구 /rental 카탈로그가 nav 라벨(STUDIOS)과 일치하는
// /studios 로 이사했다. 콘텐츠는 기존 검증본 CategoryCatalog 그대로 — 디자인(Studio.dc.html)
// 기반 레이아웃 신설은 스냅샷 확보 후 5d-2 에서 진행한다(신규 카피 0 원칙).
// force-dynamic (DB prices + display FX at request time — CLAUDE.md §6); the shared
// CategoryCatalog does the locale exposure gate (data-driven 404). Rental packages
// (1Hour/1Pro) are ko-only (CLAUDE.md §5), so this route 404s in en/ja/zh-* — which
// is why /studios is excluded from the sitemap (same as old /rental).
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

export default function StudiosPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return <CategoryCatalog category="rental" locale={locale} />;
}
