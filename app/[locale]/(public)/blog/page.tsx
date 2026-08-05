import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { EditorialImage } from '@/components/home/editorial-image';
import { BLOG_PAGE_SIZE, listBlogPosts } from '@/lib/blog/queries';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { buildAlternates } from '@/lib/seo/metadata';

/**
 * BLOG 목록 페이지 (시퀀스 5e-1). 실측 소스 = `design/pages/Blog.dc.html`.
 * 스펙 = `docs/specs/Blog_Slice_Spec.md` (결정 ③ = 자체 운영·Ghost 배제).
 *
 * 글 본문·제목 = en 단일(결정 ⓒ), UI 크롬만 5로케일(`blog` ns). 게시 = content/blog/*.md →
 * `pnpm seed:blog`(결정 ⓑ). nav BLOG 탭·sitemap 편입은 Ghost 이관(5e-2) 후 — 그 전까지
 * 이 라우트는 존재하되 비링크(빈 목록 회피, 스펙 §2-ⓐ).
 *
 * 디자인 대비 의도적 델타:
 *  - 카테고리 탭 = 발행 글의 실존 카테고리만(하드코딩 4종 탭 금지 — 스펙 §1-D10). 필터·
 *    페이지네이션은 searchParams(?category=·?page=) 서버 렌더 — 디자인의 클라이언트 상태 대체.
 *  - placeholder 글 9건 이식 금지(§1-D1 — 실존 미확인 고객 스토리). 뉴스레터 섹션 이연(ⓓ).
 *  - 커버 이미지: 실사진 미확보 — `EditorialImage` placeholder(4b 패턴).
 *  - 소형 텍스트 알파: 라이트 /70·다크 /65 (§11-W).
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'blog' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: buildAlternates(locale as Locale, '/blog'),
  };
}

export default async function BlogPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { category?: string; page?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'blog' });

  const all = await listBlogPosts();
  const categories = [...new Set(all.map((p) => p.category))];
  // 미존재 카테고리 쿼리는 전체로 강등(오류 대신 — 죽은 필터 0).
  const category = categories.includes(searchParams.category ?? '')
    ? searchParams.category
    : undefined;
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1);

  const featured = !category ? (all.find((p) => p.featured) ?? null) : null;
  const pool = all.filter((p) => (category ? p.category === category : p.slug !== featured?.slug));
  const shown = pool.slice(0, page * BLOG_PAGE_SIZE);
  const remaining = pool.length - shown.length;

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const readLabel = (min: number) => t('readMinutes', { min });

  return (
    <main>
      {/* Hero — 메타 스트립 /70 (§11-W) */}
      <section className="mx-auto max-w-container-max px-gutter pt-10">
        <div className="flex flex-wrap justify-between gap-1.5 pb-5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/70">
          <span>{t('hero.meta.a')}</span>
          <span>{t('hero.meta.b')}</span>
          <span>{t('hero.meta.c')}</span>
        </div>
        <h1 className="ks-display text-[clamp(46px,9vw,110px)] leading-[0.9] tracking-[-0.01em] text-foreground">
          {t('hero.title')}
        </h1>
      </section>

      {/* 카테고리 탭 — 발행 글의 실존 카테고리만(데이터 주도) */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-container-max px-gutter pt-7">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`rounded-full border px-4 py-2 text-[13px] font-bold ${
                category
                  ? 'border-foreground/25 text-foreground'
                  : 'border-foreground bg-foreground text-background'
              }`}
            >
              {t('categories.all')}
            </Link>
            {categories.map((c) => (
              <Link
                key={c}
                href={`/blog?category=${c}`}
                className={`rounded-full border px-4 py-2 text-[13px] font-bold ${
                  category === c
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-foreground/25 text-foreground'
                }`}
              >
                {t(`categories.${c}`)}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured — 전체 탭에서만(디자인 규칙) */}
      {featured && (
        <section className="mx-auto max-w-container-max px-gutter pt-6">
          <Link
            href={`/blog/${featured.slug}`}
            className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] overflow-hidden rounded-[20px] bg-foreground text-background"
          >
            <div className="min-h-[280px]">
              <EditorialImage alt={t('coverAlt', { title: featured.title })} className="h-full" />
            </div>
            <div className="flex flex-col justify-center gap-3.5 p-[clamp(26px,4vw,44px)]">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-primary">
                {t(`categories.${featured.category}`)} · {readLabel(featured.readMinutes)}
              </span>
              <h2 className="ks-display m-0 text-[clamp(26px,3.4vw,42px)] leading-[1.05]">
                {featured.title}
              </h2>
              <p className="m-0 max-w-[46ch] text-[14.5px] leading-[1.65] text-background/65">
                {featured.excerpt}
              </p>
              <span className="text-[14px] font-extrabold">{t('readArticle')} →</span>
            </div>
          </Link>
        </section>
      )}

      {/* 포스트 그리드 */}
      <section className="mx-auto max-w-container-max px-gutter pt-6">
        {shown.length === 0 ? (
          <p className="py-14 text-center text-[14px] text-foreground/70">{t('empty')}</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-[18px]">
            {shown.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="flex flex-col overflow-hidden rounded-ks-bar bg-paper-raise shadow-[0_2px_12px_rgba(20,18,16,0.06)]"
              >
                <div className="aspect-[16/10]">
                  <EditorialImage alt={t('coverAlt', { title: post.title })} className="h-full" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-[18px] pb-5">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-primary">
                    {t(`categories.${post.category}`)} · {readLabel(post.readMinutes)}
                  </span>
                  <h3 className="m-0 text-[18px] font-extrabold leading-[1.2] text-foreground">
                    {post.title}
                  </h3>
                  <p className="m-0 flex-1 text-[13px] leading-[1.6] text-foreground/70">
                    {post.excerpt}
                  </p>
                  <span className="mt-1 text-[11.5px] text-foreground/70">
                    {dateFmt.format(post.publishedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {remaining > 0 && (
          <div className="pt-8 text-center">
            <Link
              href={`/blog?${category ? `category=${category}&` : ''}page=${page + 1}`}
              className="inline-block rounded-full border border-foreground px-[30px] py-[13px] text-[14px] font-extrabold text-foreground"
            >
              {t('loadMore', { count: remaining })}
            </Link>
          </div>
        )}
      </section>

      {/* CTA — 뉴스레터(디자인)는 이연(스펙 §2-ⓓ), 5a·5d CTA 패턴으로 대체 */}
      <section className="mx-auto max-w-container-max px-gutter pb-16 pt-14">
        <div className="flex flex-wrap items-center justify-between gap-7 rounded-[24px] bg-primary p-[clamp(30px,5vw,60px)]">
          <h2 className="ks-display text-[clamp(34px,6vw,72px)] leading-[0.94] text-white">
            {t('cta.title1')}
            <br />
            {t('cta.title2')}
          </h2>
          <Link
            href="/product#bookbar"
            className="rounded-full bg-white px-[26px] py-[15px] text-[15px] font-extrabold text-foreground"
          >
            {t('cta.book')} →
          </Link>
        </div>
      </section>
    </main>
  );
}
