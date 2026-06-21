import type { SongView } from './song-queries';

// Public-visibility rule for a single song accessed by URL (2b-2b-1). A song is publicly viewable
// iff it exists, is active, and has a published slug. The song-detail route gates on this
// (→ notFound() otherwise). This is the single place the rule lives:
//   • inactive songs are private even by direct URL — consistent with listSongs `activeOnly` and
//     the sitemap exclusion (a deliberate "(b)" decision: not just unlisted, but 404).
//   • a NULL-slug song (non-ASCII canonical, pending migration Phase 2) has no canonical URL.
// getSongBySlug stays a pure lookup (no active filter, like getSong/getPackageBySlug) so admin/
// preview callers can still reach inactive songs; the public route applies this gate on top.
export function isSongPubliclyVisible(song: SongView | null): song is SongView {
  if (song === null) return false;
  return song.isActive && song.slug !== null;
}
