import slugify from '@sindresorhus/slugify';

// Song slug generation (PRD §6.3 / C18, 2b-SEO-migration Phase 1). Deterministic + immutable once
// assigned. Phase 1 derives from canonical only; non-ASCII/empty → null (Phase 2 decides fallback).

export const MAX_SLUG_LEN = 80;

// Aiden-confirmed lib + options. decamelize:false keeps names like "BTS" intact (no b-t-s split).
const SLUGIFY_OPTS = { lowercase: true, separator: '-', decamelize: false } as const;

const trimDash = (s: string): string => s.replace(/-+$/, '');

// Pure base slug from (canonicalArtist, canonicalTitle) — NOT truncated. Empty parts are dropped;
// if both slugify to empty (e.g. Korean canonical), returns null → caller leaves slug NULL.
export function slugifyPair(canonicalArtist: string, canonicalTitle: string): string | null {
  const raw = [slugify(canonicalArtist, SLUGIFY_OPTS), slugify(canonicalTitle, SLUGIFY_OPTS)]
    .filter(Boolean)
    .join('-');
  return raw === '' ? null : raw;
}

// Resolve a unique slug ≤ MAX_SLUG_LEN. Truncation and the collision suffix are decided together
// here (single place) so the final value — base plus any `-N` suffix — is ALWAYS ≤ MAX_SLUG_LEN.
// `taken` holds slugs already assigned (callers add the returned value before the next call).
export function assignSlug(raw: string, taken: Set<string>): string {
  const base0 = trimDash(raw.slice(0, MAX_SLUG_LEN));
  if (!taken.has(base0)) return base0;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const base = trimDash(raw.slice(0, MAX_SLUG_LEN - suffix.length));
    const candidate = `${base}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}
