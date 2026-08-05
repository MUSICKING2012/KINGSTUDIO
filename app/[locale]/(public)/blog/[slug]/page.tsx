import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { EditorialImage } from '@/components/home/editorial-image';
import { buildBlogPostJsonLd } from '@/lib/blog/jsonld';
import { getBlogPostBySlug, listBlogPosts, pickRelated } from '@/lib/blog/queries';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { buildAlternates } from '@/lib/seo/metadata';

/**
 * BLOG 상세 페이지 (시퀀스 5e-1). 실측 소스 = `design/pages/Blog Post.dc.html`.
 * 스펙 = `docs/specs/Blog_Slice_Spec.md`.
 *
 * 본문 = DB markdown → react-markdown(raw HTML 미허용 기본값 = XSS 차단, remark-gfm).
 * JSON-LD = `lib/blog/jsonld.ts`(BlogPosting + BreadcrumbList — 감사 제외 정책 유지:
 * Review·AggregateRating·FAQPage·HowTo 미사용). 미발행·미존재 slug = notFound().
 *
 * 디자인 대비 델타: 중간 다크 CTA·END CTA 는 /product#bookbar(5a 패턴), 뉴스레터 이연(ⓓ),
 * 커버 EditorialImage placeholder, 소형 텍스트 /70·다크 /65 (§11-W).
 */
export const dynamic = 'force-dynamic';

type Params = { params: { locale: string; slug: string } };

export async function generateMetadata({ params: { locale, slug } }: Params): Promise<Metadata> {
  const post = await getBlogPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} — KING STUDIO`,
    description: post.excerpt,
    alternates: buildAlternates(locale as Locale, `/blog/${post.slug}`),
    openGraph: { type: 'article', title: post.title, description: post.excerpt },
  };
}

export default async function BlogPostPage({ params: { locale, slug } }: Params) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'blog' });

  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();
  const related = pickRelated(await listBlogPosts(), post);

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const jsonLd = buildBlogPostJsonLd(post, locale as Locale);

  return (
    <main>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: code-built object JSON.stringify'd (no user-controlled markup) — the canonical Next.js way to emit JSON-LD (song-detail 선례)
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 헤더 — 브레드크럼·메타·h1·저자 배지·커버 */}
      <article className="mx-auto max-w-[960px] px-gutter pt-9">
        <div className="pb-3.5 text-[12px] text-foreground/70">
          <Link href="/blog" className="font-semibold hover:text-primary">
            {t('breadcrumb')}
          </Link>{' '}
          / {t(`categories.${post.category}`)}
        </div>
        <div className="pb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-primary">
          {t(`categories.${post.category}`)} · {dateFmt.format(post.publishedAt)} ·{' '}
          {t('readMinutes', { min: post.readMinutes })}
        </div>
        <h1 className="ks-display m-0 text-[clamp(30px,5vw,58px)] leading-[1.03] tracking-[-0.01em] text-foreground">
          {post.title}
        </h1>
        <div className="flex items-center gap-2.5 py-[18px] pb-[22px]">
          <span
            aria-hidden="true"
            className="grid h-[30px] w-[30px] place-items-center rounded-[7px] bg-foreground text-[13px] font-extrabold text-background"
          >
            K
          </span>
          <span className="text-[13.5px] font-bold text-foreground">KING STUDIO</span>
        </div>
        <div className="aspect-[16/8] overflow-hidden rounded-ks-bar">
          <EditorialImage alt={t('coverAlt', { title: post.title })} className="h-full" />
        </div>
      </article>

      {/* 본문 — markdown, 720px 칼럼 */}
      <article className="mx-auto max-w-[720px] px-gutter pt-[38px]">
        <p className="m-0 mb-5 text-[19px] font-semibold leading-[1.6] text-foreground">
          {post.excerpt}
        </p>
        <div className="[&_a]:font-bold [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-[30px] [&_blockquote]:border-l-[3px] [&_blockquote]:border-primary [&_blockquote]:py-1.5 [&_blockquote]:pl-[22px] [&_blockquote]:text-[21px] [&_blockquote]:font-semibold [&_blockquote]:leading-[1.4] [&_h2]:mb-3.5 [&_h2]:mt-[38px] [&_h2]:text-[26px] [&_h2]:font-extrabold [&_h2]:leading-[1.15] [&_p]:mb-5 [&_p]:mt-0 [&_p]:text-[17px] [&_p]:leading-[1.75] [&_p]:text-foreground/80">
          <Markdown remarkPlugins={[remarkGfm]}>{post.body}</Markdown>
        </div>

        {/* 중간 CTA(디자인) → /product#bookbar */}
        <div className="my-[30px] flex flex-wrap items-center justify-between gap-[18px] rounded-ks-bar bg-foreground p-[26px] text-background">
          <span className="ks-display text-[20px] uppercase leading-[1.1]">
            {t('inlineCta.line1')}
            <br />
            {t('inlineCta.line2')}
          </span>
          <Link
            href="/product#bookbar"
            className="rounded-full bg-primary px-6 py-[13px] text-[14px] font-extrabold text-white"
          >
            {t('cta.book')} →
          </Link>
        </div>
      </article>

      {/* Related — 동일 카테고리 우선 3건 */}
      {related.length > 0 && (
        <section className="mx-auto max-w-container-max px-gutter pt-[52px]">
          <h2 className="ks-display mb-5 text-[clamp(22px,3vw,34px)] uppercase text-foreground">
            {t('related')}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="flex flex-col overflow-hidden rounded-ks-bar bg-paper-raise shadow-[0_2px_12px_rgba(20,18,16,0.06)]"
              >
                <div className="aspect-[16/10]">
                  <EditorialImage alt={t('coverAlt', { title: r.title })} className="h-full" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4 px-[18px] pb-[18px]">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-primary">
                    {t(`categories.${r.category}`)} · {t('readMinutes', { min: r.readMinutes })}
                  </span>
                  <h3 className="m-0 text-[16px] font-extrabold leading-[1.25] text-foreground">
                    {r.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* END CTA */}
      <section className="mx-auto max-w-container-max px-gutter pb-16 pt-11">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[24px] bg-foreground p-[clamp(30px,5vw,56px)] text-background">
          <h2 className="ks-display m-0 text-[clamp(28px,4.5vw,52px)] uppercase leading-[0.96]">
            {t('endCta.line1')}
            <br />
            {t('endCta.line2')}
          </h2>
          <Link
            href="/product#bookbar"
            className="rounded-full bg-primary px-7 py-[15px] text-[15px] font-extrabold text-white"
          >
            {t('cta.book')} →
          </Link>
        </div>
      </section>
    </main>
  );
}
