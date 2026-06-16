import { describe, expect, it } from 'vitest';
import { checkLocales, diffKeys, flattenKeys } from './check-i18n-keys';

describe('flattenKeys', () => {
  it('flattens nested objects into sorted dot-notation keys', () => {
    expect(flattenKeys({ home: { title: 'x', subtitle: 'y' } })).toEqual([
      'home.subtitle',
      'home.title',
    ]);
  });

  it('treats each leaf value as a single key regardless of value type', () => {
    expect(flattenKeys({ a: 'str', b: 1, c: null })).toEqual(['a', 'b', 'c']);
  });
});

describe('diffKeys', () => {
  it('reports keys present in reference but missing from target', () => {
    expect(diffKeys(['a', 'b', 'c'], ['a', 'c'])).toEqual({ missing: ['b'], extra: [] });
  });

  it('reports keys present in target but absent from reference', () => {
    expect(diffKeys(['a'], ['a', 'z'])).toEqual({ missing: [], extra: ['z'] });
  });

  it('returns no diff when key sets match', () => {
    expect(diffKeys(['a', 'b'], ['b', 'a'])).toEqual({ missing: [], extra: [] });
  });
});

describe('checkLocales (against real message catalogs)', () => {
  it('finds all 5 locales in sync', () => {
    expect(checkLocales()).toEqual([]);
  });
});
