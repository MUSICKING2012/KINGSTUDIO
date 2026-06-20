import { describe, expect, it } from 'vitest';
import { type DerivedMeta, resolvePageMeta } from './page-meta';

const derived: DerivedMeta = {
  title: 'Dynamite — BTS',
  description: 'Derived description',
  canonicalUrl: 'https://x/en/songs/dynamite',
};

// §6.3 / C18 fallback priority: PageSeo override → Song-derived. (The locale chain
// requested→en→canonical is applied UPSTREAM when the caller builds `derived`.)
describe('resolvePageMeta', () => {
  it('uses derived values when there is no override', () => {
    expect(resolvePageMeta(derived)).toMatchObject({
      title: 'Dynamite — BTS',
      description: 'Derived description',
      canonicalUrl: 'https://x/en/songs/dynamite',
      noindex: false,
      nofollow: false,
    });
  });

  it('override wins per field; unspecified fields fall through to derived', () => {
    const r = resolvePageMeta(derived, { title: 'Custom title', noindex: true });
    expect(r.title).toBe('Custom title');
    expect(r.description).toBe('Derived description');
    expect(r.noindex).toBe(true);
  });

  it('blank / whitespace override falls through to derived (not an empty meta)', () => {
    expect(resolvePageMeta(derived, { title: '   ', description: '' }).title).toBe(
      'Dynamite — BTS',
    );
    expect(resolvePageMeta(derived, { description: '' }).description).toBe('Derived description');
  });

  it('noindex / nofollow default to false', () => {
    expect(resolvePageMeta(derived, {})).toMatchObject({ noindex: false, nofollow: false });
  });
});
