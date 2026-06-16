/**
 * i18n missing-key check (PRD §5.1 / CLAUDE.md §5).
 *
 * Verifies that every locale's message catalog has exactly the same key set as the
 * reference locale (`en`, the required fallback). Run in CI before build; exits non-zero
 * on any missing or extra key so translations can't silently drift.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultLocale, locales } from '../lib/i18n/routing';

const MESSAGES_DIR = join(process.cwd(), 'messages');

/** Flatten a nested message object into sorted dot-notation leaf keys. */
export function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') {
    return [prefix];
  }
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    keys.push(...flattenKeys(value, path));
  }
  return keys.sort();
}

/** Compare a target key set against the reference; report what's missing or extra. */
export function diffKeys(
  reference: string[],
  target: string[],
): { missing: string[]; extra: string[] } {
  const refSet = new Set(reference);
  const targetSet = new Set(target);
  return {
    missing: reference.filter((k) => !targetSet.has(k)),
    extra: target.filter((k) => !refSet.has(k)),
  };
}

function loadKeys(locale: string): string[] {
  const raw = readFileSync(join(MESSAGES_DIR, `${locale}.json`), 'utf-8');
  return flattenKeys(JSON.parse(raw));
}

/** Returns a list of human-readable problems; empty array means all locales match. */
export function checkLocales(): string[] {
  const referenceKeys = loadKeys(defaultLocale);
  const problems: string[] = [];

  for (const locale of locales) {
    if (locale === defaultLocale) continue;
    const { missing, extra } = diffKeys(referenceKeys, loadKeys(locale));
    if (missing.length) {
      problems.push(`[${locale}] missing ${missing.length} key(s): ${missing.join(', ')}`);
    }
    if (extra.length) {
      problems.push(`[${locale}] extra ${extra.length} key(s): ${extra.join(', ')}`);
    }
  }
  return problems;
}

function main() {
  const problems = checkLocales();
  if (problems.length) {
    console.error('❌ i18n key check failed:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`✅ i18n key check passed — ${locales.length} locales in sync.`);
}

// Only run when executed directly (not when imported by tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
