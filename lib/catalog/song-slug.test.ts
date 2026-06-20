import { describe, expect, it } from 'vitest';
import { MAX_SLUG_LEN, assignSlug, slugifyPair } from './song-slug';

describe('slugifyPair (PRD §6.3 / C18 — base slug, no truncation)', () => {
  it('joins slugified artist + title (lowercase, hyphen)', () => {
    expect(slugifyPair('BTS', 'Dynamite')).toBe('bts-dynamite');
    expect(slugifyPair('Archive', 'Retired Track')).toBe('archive-retired-track');
  });

  it('returns null when both parts slugify to empty (non-ASCII / Korean canonical)', () => {
    expect(slugifyPair('아이유', '밤편지')).toBeNull();
    expect(slugifyPair('잔나비', '주저하는 연인들을 위해')).toBeNull();
  });

  it('keeps only the non-empty part when one side is non-ASCII', () => {
    expect(slugifyPair('IU', '밤편지')).toBe('iu');
  });
});

describe('assignSlug (deterministic collision + strict ≤80)', () => {
  it('returns the base when free (≤80, no suffix)', () => {
    expect(assignSlug('bts-dynamite', new Set())).toBe('bts-dynamite');
  });

  it('appends -2, -3 on collision', () => {
    const taken = new Set(['bts-dynamite']);
    const a = assignSlug('bts-dynamite', taken);
    taken.add(a);
    const b = assignSlug('bts-dynamite', taken);
    expect(a).toBe('bts-dynamite-2');
    expect(b).toBe('bts-dynamite-3');
  });

  it('truncates a long base to exactly 80 (no collision)', () => {
    const raw = 'a'.repeat(120);
    const s = assignSlug(raw, new Set());
    expect(s).toBe('a'.repeat(80));
    expect(s.length).toBe(MAX_SLUG_LEN);
  });

  it('truncation-induced collision: two different long raws sharing the first 80 chars → suffix, still ≤80', () => {
    const taken = new Set<string>();
    const rawA = `${'a'.repeat(80)}-alpha`; // first 80 = 'a'*80
    const rawB = `${'a'.repeat(80)}-bravo`; // first 80 = 'a'*80 → same base0 → collides
    const a = assignSlug(rawA, taken);
    taken.add(a);
    const b = assignSlug(rawB, taken);
    expect(a).toBe('a'.repeat(80)); // base0
    expect(b).toBe(`${'a'.repeat(78)}-2`); // base truncated to 78 to fit '-2', ≤80
    expect(b.length).toBe(MAX_SLUG_LEN);
    expect(a).not.toBe(b);
  });

  it('multi-digit suffix shrinks the base further to stay ≤80', () => {
    const raw = 'b'.repeat(100);
    const taken = new Set<string>(['b'.repeat(80)]);
    for (let n = 2; n <= 10; n++) taken.add(`${'b'.repeat(80 - `-${n}`.length)}-${n}`);
    // next free is -11 (suffix length 3) → base truncated to 77
    const s = assignSlug(raw, taken);
    expect(s).toBe(`${'b'.repeat(77)}-11`);
    expect(s.length).toBeLessThanOrEqual(MAX_SLUG_LEN);
  });
});
