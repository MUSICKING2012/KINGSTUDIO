import { prisma } from '@/lib/db/prisma';
import type { BlogPost } from '@prisma/client';

// Blog read layer (5e-1, `Blog_Slice_Spec.md` §3). Published-only everywhere — draft rows
// (isPublished=false) never leave this module. Body/title are en-only (decision ⓒ); no
// locale filter exists by design.

export const BLOG_PAGE_SIZE = 6;

export async function listBlogPosts(opts?: {
  category?: string;
}): Promise<BlogPost[]> {
  return prisma.blogPost.findMany({
    where: { isPublished: true, ...(opts?.category ? { category: opts.category } : {}) },
    orderBy: { publishedAt: 'desc' },
  });
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  return post?.isPublished ? post : null;
}

/// Related = same category first, then recency (design rule), excluding the post itself.
export function pickRelated(all: BlogPost[], current: BlogPost, count = 3): BlogPost[] {
  return all
    .filter((p) => p.slug !== current.slug)
    .sort((a, b) => {
      const catDiff =
        Number(b.category === current.category) - Number(a.category === current.category);
      return catDiff !== 0 ? catDiff : b.publishedAt.getTime() - a.publishedAt.getTime();
    })
    .slice(0, count);
}
