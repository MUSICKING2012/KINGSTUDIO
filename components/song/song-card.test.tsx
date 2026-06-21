import { describe, expect, it } from 'vitest';
import { SongCard } from './song-card';

// DB-free presentational test: SongCard is a pure component (no DB), so we render it by calling it
// and walking the returned React element tree (the repo's node-env convention — no react-dom). The
// i18n Link node carries `href`; a non-link card has none. No `songs` table access → no race
// (handoff memo 2).

// biome-ignore lint/suspicious/noExplicitAny: traversing an untyped React element tree in a test.
function findHref(node: any): string | null {
  if (!node || typeof node !== 'object') return null;
  if (typeof node.props?.href === 'string') return node.props.href;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findHref(child);
    if (found) return found;
  }
  return null;
}

// biome-ignore lint/suspicious/noExplicitAny: traversing an untyped React element tree in a test.
function containsText(node: any, text: string): boolean {
  if (node == null || typeof node === 'boolean') return false;
  if (typeof node === 'string' || typeof node === 'number') return String(node).includes(text);
  if (!(typeof node === 'object')) return false;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    if (containsText(child, text)) return true;
  }
  return false;
}

const base = {
  title: 'Dynamite',
  artist: 'BTS',
  beginnerCuration: false,
  beginnerLabel: 'Beginner',
  licenseBadges: [] as string[],
};

describe('SongCard', () => {
  it('renders a link to the detail path when href is provided', () => {
    const el = SongCard({ ...base, href: '/songs/bts-dynamite' });
    expect(findHref(el)).toBe('/songs/bts-dynamite');
    // content still present
    expect(containsText(el, 'Dynamite')).toBe(true);
    expect(containsText(el, 'BTS')).toBe(true);
  });

  it('renders a non-link card (no href) when href is absent — title/artist still shown', () => {
    const el = SongCard({ ...base, href: undefined });
    expect(findHref(el)).toBeNull();
    expect(containsText(el, 'Dynamite')).toBe(true);
    expect(containsText(el, 'BTS')).toBe(true);
  });

  it('shows the beginner badge in both link and non-link cards', () => {
    const linked = SongCard({ ...base, beginnerCuration: true, href: '/songs/bts-dynamite' });
    const plain = SongCard({ ...base, beginnerCuration: true, href: undefined });
    expect(containsText(linked, 'Beginner')).toBe(true);
    expect(containsText(plain, 'Beginner')).toBe(true);
  });
});
