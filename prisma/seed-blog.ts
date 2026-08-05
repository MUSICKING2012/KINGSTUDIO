import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '../lib/db/prisma';

// Idempotent publishing pipeline (5e-1, `Blog_Slice_Spec.md` §2 decision ⓑ). Run: pnpm seed:blog
// Reads content/blog/*.md (flat key:value frontmatter between --- fences) and upserts by slug.
// Body/title are English-only (decision ⓒ). Category is CHECK-constrained by the DB — an
// out-of-contract value fails loudly here, never at render time.
const CONTENT_DIR = join(__dirname, '..', 'content', 'blog');

type FrontMatter = Record<string, string>;

function parse(file: string): { front: FrontMatter; body: string } {
  const raw = readFileSync(join(CONTENT_DIR, file), 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error(`${file}: missing frontmatter fence`);
  const front: FrontMatter = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    front[key] = value;
  }
  return { front, body: raw.slice(match[0].length).trim() };
}

function required(front: FrontMatter, file: string, key: string): string {
  const value = front[key];
  if (!value) throw new Error(`${file}: frontmatter missing "${key}"`);
  return value;
}

async function main() {
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.log('No content/blog/*.md files — nothing to publish.');
    return;
  }
  for (const file of files) {
    const { front, body } = parse(file);
    const slug = required(front, file, 'slug');
    const data = {
      category: required(front, file, 'category'),
      title: required(front, file, 'title'),
      excerpt: required(front, file, 'excerpt'),
      body,
      readMinutes: Number.parseInt(required(front, file, 'readMinutes'), 10),
      featured: front.featured === 'true',
      isPublished: front.isPublished !== 'false',
      publishedAt: new Date(required(front, file, 'publishedAt')),
      legacyPath: front.legacyPath ?? null,
    };
    await prisma.blogPost.upsert({ where: { slug }, update: data, create: { slug, ...data } });
    console.log(`Published: ${slug} (${data.category}${data.featured ? ', featured' : ''})`);
  }
}

main().finally(() => prisma.$disconnect());
