-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_minutes" INTEGER NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3) NOT NULL,
    "legacy_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_category_idx" ON "blog_posts"("category");

-- CreateIndex
CREATE INDEX "blog_posts_is_published_published_at_idx" ON "blog_posts"("is_published", "published_at");

-- Hand-appended (5d-3 CHECK pattern): category resolves to blog.categories.{key} message keys —
-- an out-of-contract value would throw MISSING_MESSAGE at render. Enforce at the DB.
ALTER TABLE "blog_posts"
  ADD CONSTRAINT "blog_posts_category_check" CHECK ("category" IN ('story', 'press', 'behind', 'seoulTravel'));
