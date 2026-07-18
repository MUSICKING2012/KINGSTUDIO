import { describe, expect, it } from 'vitest';
import { maskAuthorName } from './mask';

describe('maskAuthorName — Hangul', () => {
  it('2 chars → first + "*"', () => expect(maskAuthorName('김진')).toBe('김*'));
  it('3 chars → first + "*" + last', () => expect(maskAuthorName('김서진')).toBe('김*진'));
  it('4 chars → first + "*"×2 + last', () => expect(maskAuthorName('남궁서진')).toBe('남**진'));
  it('1 char → first + "*" (boundary)', () => expect(maskAuthorName('김')).toBe('김*'));
  it('spaced Hangul name → stripped then same rule as 3-char', () =>
    expect(maskAuthorName('김 서 진')).toBe('김*진'));
  it('trailing emoji kept intact, not split', () =>
    expect(maskAuthorName('김서진😀')).toBe('김**😀'));
  it('emoji in the middle counted as one code point', () =>
    expect(maskAuthorName('김😀진')).toBe('김*진'));
});

describe('maskAuthorName — Kana / Han', () => {
  it('with space → first token + "＊"', () => expect(maskAuthorName('田中 由紀')).toBe('田中＊'));
  it('without space → first char + "＊"×(n-1)', () =>
    expect(maskAuthorName('田中由紀')).toBe('田＊＊＊'));
  it('fullwidth space (U+3000) counts as a space separator', () =>
    expect(maskAuthorName('田中　由紀')).toBe('田中＊'));
  it('astral-plane Han char counted as one code point', () =>
    expect(maskAuthorName('田中𠮷')).toBe('田＊＊'));
});

describe('maskAuthorName — Latin / other', () => {
  it('two tokens → first token + " " + last-first + "."', () =>
    expect(maskAuthorName('Yuki Tanaka')).toBe('Yuki T.'));
  it('single token → first char + "."', () => expect(maskAuthorName('Madonna')).toBe('M.'));
  it('three tokens → first token + " " + last-first + "." (middle ignored)', () =>
    expect(maskAuthorName('Mary Jane Watson')).toBe('Mary W.'));
  it('digit-start single token → Latin fallback', () =>
    expect(maskAuthorName('007Bond')).toBe('0.'));
  it('digit-start two tokens → Latin fallback', () =>
    expect(maskAuthorName('123 Smith')).toBe('123 S.'));
  it('emoji-start single token → Latin fallback, first code point kept intact', () =>
    expect(maskAuthorName('😀ohn')).toBe('😀.'));
  it('emoji-start two tokens → Latin fallback', () =>
    expect(maskAuthorName('😀 Doe')).toBe('😀 D.'));
});

describe('maskAuthorName — empty / boundary', () => {
  it('empty string → "Guest"', () => expect(maskAuthorName('')).toBe('Guest'));
  it('whitespace-only → "Guest"', () => expect(maskAuthorName('   ')).toBe('Guest'));
  it('fullwidth-space-only → "Guest"', () => expect(maskAuthorName('　　')).toBe('Guest'));
});
