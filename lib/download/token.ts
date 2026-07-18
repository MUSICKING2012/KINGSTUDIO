// Magic-link token primitives (Stage E1, ⚠ §4 위험구역 — C15 token security). The raw token goes
// only into the customer's email/URL; the DB stores a SHA-256 hash (magic_links.token_hash), so a
// DB leak never exposes live download links — same principle as Stage 1 password-reset tokens.

import { createHash, randomBytes } from 'node:crypto';

// 32 random bytes → 43-char base64url. Never persisted; shown once at issue time.
export function generateMagicToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashMagicToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

// URL-shape sanity gate before hitting the DB (cheap rejection of garbage/probing input).
export function isPlausibleMagicToken(rawToken: string): boolean {
  return /^[A-Za-z0-9_-]{40,64}$/.test(rawToken);
}
