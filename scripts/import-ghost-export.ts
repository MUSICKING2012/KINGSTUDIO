/**
 * 5e-2 — Ghost export → content/blog/*.md 이관 (Blog_Slice_Spec §3, Pages_Sequence_Spec §6-B ①).
 *
 *   pnpm tsx scripts/import-ghost-export.ts <ghost-export.json>
 *
 * - 발행 글(post·published)만. html → markdown(turndown), excerpt = custom_excerpt 우선.
 * - 카테고리 = Ghost primary tag → TAG_TO_CATEGORY 매핑. **미매핑 태그 발견 시 전체 census 를
 *   출력하고 실패** — 임의 분류는 발명(Aiden 이 맵을 확장해 재실행).
 * - legacyPath = `/${ghost slug}/` (현 kingstudio.co.kr Ghost URL 구조). 이관 후
 *   content/blog/legacy-redirects.json 을 전체 md 기준으로 재생성(빌드 시 next.config 301 소스).
 * - 기존 md 와 slug 충돌(예: NYT 원글) → 본문은 기존 파일 유지(스킵), legacyPath 만 주입.
 * - 멱등: 같은 export 로 재실행하면 동일 결과. DB 반영은 별도 `pnpm seed:blog`.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import TurndownService from 'turndown';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');
const REDIRECTS_PATH = path.join(CONTENT_DIR, 'legacy-redirects.json');

/** Ghost tag slug → blog_posts.category (CHECK: story|press|behind|seoulTravel). 확장은 Aiden 결정. */
const TAG_TO_CATEGORY: Record<string, string> = {
  story: 'story',
  press: 'press',
  behind: 'behind',
  'seoul-travel': 'seoulTravel',
};

type GhostPost = {
  id: string;
  type?: string;
  status?: string;
  slug: string;
  title: string;
  html?: string | null;
  custom_excerpt?: string | null;
  plaintext?: string | null;
  published_at?: string | null;
  featured?: number | boolean;
};

function esc(v: string): string {
  return `'${v.replace(/'/g, '’')}'`;
}

function main() {
  const exportPath = process.argv[2];
  if (!exportPath) {
    console.error('사용법: pnpm tsx scripts/import-ghost-export.ts <ghost-export.json>');
    process.exit(1);
  }
  const parsed = JSON.parse(readFileSync(exportPath, 'utf8'));
  const data = parsed.db?.[0]?.data ?? parsed.data;
  if (!data?.posts) {
    console.error('Ghost export 형식 아님(db[0].data.posts 부재)');
    process.exit(1);
  }
  const tagsById = new Map<string, string>(
    (data.tags ?? []).map((t: { id: string; slug: string }) => [t.id, t.slug]),
  );
  // sort_order 0 = primary tag (Ghost 규약)
  const primaryTagByPost = new Map<string, string>();
  for (const pt of data.posts_tags ?? []) {
    if (pt.sort_order === 0) {
      const slug = tagsById.get(pt.tag_id);
      if (slug) primaryTagByPost.set(pt.post_id, slug);
    }
  }

  const posts: GhostPost[] = (data.posts as GhostPost[]).filter(
    (p) => (p.type ?? 'post') === 'post' && p.status === 'published',
  );
  console.log(`발행 글 ${posts.length}건 발견`);

  // 태그 census — 미매핑 태그가 하나라도 있으면 전체 목록 출력 후 실패(§6-B: Aiden 결정 대기)
  const census = new Map<string, number>();
  for (const p of posts) {
    const tag = primaryTagByPost.get(p.id) ?? '(태그 없음)';
    census.set(tag, (census.get(tag) ?? 0) + 1);
  }
  const unmapped = [...census.keys()].filter((t) => !TAG_TO_CATEGORY[t]);
  console.log('primary 태그 census:');
  for (const [tag, n] of census) {
    console.log(
      `  ${tag}: ${n}건 ${TAG_TO_CATEGORY[tag] ? `→ ${TAG_TO_CATEGORY[tag]}` : '⚠ 미매핑'}`,
    );
  }
  if (unmapped.length > 0) {
    console.error(
      `\n미매핑 태그 ${unmapped.length}종 — TAG_TO_CATEGORY 확장(Aiden 결정) 후 재실행.`,
    );
    process.exit(1);
  }

  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  const existing = new Set(readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md')));
  let written = 0;
  let merged = 0;
  for (const p of posts) {
    const legacyPath = `/${p.slug}/`;
    const file = `${p.slug}.md`;
    if (existing.has(file)) {
      // slug 충돌(예: NYT 원글) — 기존 본문 보존, legacyPath 만 연결
      const fp = path.join(CONTENT_DIR, file);
      const raw = readFileSync(fp, 'utf8');
      if (!/^legacyPath:/m.test(raw)) {
        writeFileSync(fp, raw.replace(/\n---\n/, `\nlegacyPath: ${legacyPath}\n---\n`));
        merged++;
        console.log(`기존 글 유지 + legacyPath 연결: ${file}`);
      }
      continue;
    }
    const markdown = p.html ? turndown.turndown(p.html) : (p.plaintext ?? '');
    if (!markdown.trim()) {
      console.error(`본문 없음(html·plaintext 공백): ${p.slug} — 건너뜀`);
      continue;
    }
    const excerptSrc = p.custom_excerpt?.trim() || (p.plaintext ?? markdown).trim();
    const excerpt = excerptSrc.replace(/\s+/g, ' ').slice(0, 200);
    const words = markdown.split(/\s+/).length;
    const readMinutes = Math.max(1, Math.round(words / 200));
    const category = TAG_TO_CATEGORY[primaryTagByPost.get(p.id) ?? ''];
    const publishedAt = (p.published_at ?? '').slice(0, 10);
    const front = [
      '---',
      `slug: ${p.slug}`,
      `category: ${category}`,
      `title: ${esc(p.title)}`,
      `excerpt: ${esc(excerpt)}`,
      `readMinutes: ${readMinutes}`,
      `featured: ${p.featured ? 'true' : 'false'}`,
      `publishedAt: ${publishedAt}`,
      `legacyPath: ${legacyPath}`,
      '---',
      '',
    ].join('\n');
    writeFileSync(path.join(CONTENT_DIR, file), front + markdown + '\n');
    written++;
  }

  // legacy-redirects.json 전체 재생성 (모든 md 의 legacyPath 기준 — evergreen)
  const redirects: { source: string; destination: string }[] = [];
  for (const file of readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'))) {
    const raw = readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const slug = raw.match(/^slug: (.+)$/m)?.[1]?.trim();
    const legacy = raw.match(/^legacyPath: (.+)$/m)?.[1]?.trim();
    if (slug && legacy && existsSync(path.join(CONTENT_DIR, file))) {
      redirects.push({ source: legacy.replace(/\/$/, ''), destination: `/en/blog/${slug}` });
    }
  }
  writeFileSync(REDIRECTS_PATH, `${JSON.stringify(redirects, null, 2)}\n`);
  console.log(
    `\nmd 신규 ${written}건 · legacyPath 병합 ${merged}건 · 301 맵 ${redirects.length}건`,
  );
  console.log('다음 단계: pnpm seed:blog (DB 반영) → 게이트 → 커밋');
}

main();
