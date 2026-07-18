import { describe, expect, it } from 'vitest';
import { generateMagicToken, hashMagicToken, isPlausibleMagicToken } from './token';

describe('magic token primitives (C15)', () => {
  it('generates url-safe, plausible, non-repeating tokens', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const t = generateMagicToken();
      expect(isPlausibleMagicToken(t)).toBe(true);
      expect(seen.has(t)).toBe(false);
      seen.add(t);
    }
  });

  it('hash is deterministic, hex, and never equals the raw token', () => {
    const t = generateMagicToken();
    const h = hashMagicToken(t);
    expect(h).toBe(hashMagicToken(t));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toBe(t);
  });

  it('plausibility gate rejects garbage/probing input cheaply', () => {
    for (const bad of ['', 'short', 'has space', 'x'.repeat(200), '../../etc/passwd', 'a+b/c=']) {
      expect(isPlausibleMagicToken(bad)).toBe(false);
    }
  });
});
