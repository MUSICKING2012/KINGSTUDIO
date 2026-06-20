import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { assignSlug, slugifyPair } from '../lib/catalog/song-slug';
import { prisma } from '../lib/db/prisma';

// Song.slug backfill (PRD §6.3 / C18, 2b-SEO-migration Phase 1).
//
// Idempotent: existing non-NULL slugs are NEVER changed (slug is immutable once assigned) and are
// preloaded into the taken-set so new slugs avoid colliding with them. Only slug IS NULL rows are
// considered. Deterministic baseline: ORDER BY id ASC — so a re-run assigns the same slugs.
//
// Phase 1 derives slugs from canonical (canonicalArtist + canonicalTitle) ONLY. When both slugify
// to empty (e.g. a Korean canonical) the row keeps slug = NULL — it is NOT touched. The en-derived
// fallback for those rows is a Phase 2 decision (PRD §6.3 item 3) and is intentionally absent here.
//
// Truncation (≤80) and collision suffixing live in the verified lib/catalog/song-slug helpers; this
// script does not reimplement them.

type Action = 'create' | 'keep-null' | 'skip-existing';
type Plan = {
  id: string;
  canonicalArtist: string;
  canonicalTitle: string;
  action: Action;
  slug: string | null;
};

export async function planBackfill(): Promise<Plan[]> {
  const songs = await prisma.song.findMany({
    select: { id: true, canonicalArtist: true, canonicalTitle: true, slug: true },
    orderBy: { id: 'asc' },
  });

  // Preload every slug already assigned (this run will not reuse them).
  const taken = new Set<string>(songs.map((s) => s.slug).filter((s): s is string => s !== null));

  const plans: Plan[] = [];
  for (const s of songs) {
    const base = { id: s.id, canonicalArtist: s.canonicalArtist, canonicalTitle: s.canonicalTitle };
    if (s.slug !== null) {
      plans.push({ ...base, action: 'skip-existing', slug: s.slug });
      continue;
    }
    const raw = slugifyPair(s.canonicalArtist, s.canonicalTitle);
    if (raw === null) {
      // Non-ASCII / empty canonical → leave NULL (Phase 2 decides the fallback).
      plans.push({ ...base, action: 'keep-null', slug: null });
      continue;
    }
    const slug = assignSlug(raw, taken);
    taken.add(slug);
    plans.push({ ...base, action: 'create', slug });
  }
  return plans;
}

export async function backfillSongSlugs({ dryRun }: { dryRun: boolean }): Promise<Plan[]> {
  const plans = await planBackfill();

  const toCreate = plans.filter((p) => p.action === 'create');
  const keepNull = plans.filter((p) => p.action === 'keep-null');
  const skipExisting = plans.filter((p) => p.action === 'skip-existing');

  console.log(`\n${dryRun ? '[DRY-RUN]' : '[APPLY]'} song slug backfill — ${plans.length} rows\n`);
  for (const p of plans) {
    const tag =
      p.action === 'create'
        ? `create → ${p.slug}`
        : p.action === 'keep-null'
          ? 'keep NULL (non-ASCII canonical)'
          : `skip (existing → ${p.slug})`;
    console.log(`  ${p.id} | ${p.canonicalArtist} | ${p.canonicalTitle} | ${tag}`);
  }
  console.log(
    `\nsummary: create=${toCreate.length}  keep-null=${keepNull.length}  skip-existing=${skipExisting.length}`,
  );

  if (dryRun) {
    console.log('\n[DRY-RUN] no DB writes performed.');
    return plans;
  }

  for (const p of toCreate) {
    // Guard: only write rows still NULL (immutability — never overwrite an assigned slug).
    await prisma.song.updateMany({ where: { id: p.id, slug: null }, data: { slug: p.slug } });
  }
  console.log(`\n[APPLY] wrote ${toCreate.length} slug(s).`);
  return plans;
}

// Run only when executed directly. Default is DRY-RUN; pass --apply to write.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dryRun = !process.argv.includes('--apply');
  backfillSongSlugs({ dryRun })
    .catch((e) => {
      console.error('backfill failed:', e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
