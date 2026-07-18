// Review author-name masking (PRD §5.9 — reviews.author_display). Pure, import-free function so
// it is safe to call from a client component. Script-detected from the first non-whitespace
// character; each script family has its own masking convention. Every length and index below is a
// COUNT OF CODE POINTS, not of UTF-16 units: String.length / str[i] would split surrogate pairs
// (emoji, rare CJK beyond the BMP) and emit a broken half-character, so each branch iterates via
// Array.from. Do not "simplify" these back to .length.
//   - Hangul (AC00–D7A3): spaces stripped first, then masked by code-point count n —
//     n ≤ 2 → first + "*"; n ≥ 3 → first + "*"×(n-2) + last.
//   - Kana (3040–30FF) / Han (4E00–9FFF): with a space → first token + "＊" (fullwidth asterisk);
//     without a space → first code point + "＊"×(n-1).
//   - Everything else (Latin, digits, emoji, ...): with a space → first token + " " + last
//     token's first code point + "."; single token → first code point + ".".
// Full name is never stored beyond authorNameSnapshot (🔒 PII) — this is the DISPLAY value only.

export function maskAuthorName(fullName: string): string {
  const trimmed = fullName.trim();
  if (trimmed.length === 0) return 'Guest';

  const codePoint = trimmed.codePointAt(0) ?? 0;
  const isHangul = codePoint >= 0xac00 && codePoint <= 0xd7a3;
  const isKanaOrHan =
    (codePoint >= 0x3040 && codePoint <= 0x30ff) || (codePoint >= 0x4e00 && codePoint <= 0x9fff);

  if (isHangul) {
    const chars = Array.from(trimmed.replace(/\s+/g, ''));
    const n = chars.length;
    if (n <= 2) return `${chars[0]}*`;
    return `${chars[0]}${'*'.repeat(n - 2)}${chars[n - 1]}`;
  }

  if (isKanaOrHan) {
    if (/\s/.test(trimmed)) {
      const [firstToken] = trimmed.split(/\s+/).filter(Boolean);
      return `${firstToken}＊`;
    }
    const cp = Array.from(trimmed);
    const n = cp.length;
    return `${cp[0]}${'＊'.repeat(n - 1)}`;
  }

  // Latin / digits / emoji / anything else — token-based fallback.
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) {
    const first = Array.from(tokens[0])[0] ?? '';
    return `${first}.`;
  }
  const first = tokens[0];
  const lastToken = tokens[tokens.length - 1];
  const lastFirst = Array.from(lastToken)[0] ?? '';
  return `${first} ${lastFirst}.`;
}
