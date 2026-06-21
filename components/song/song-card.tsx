import { BadgeCheck, Sparkles } from 'lucide-react';

import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

// Presentational song card. Display name is already fallback-resolved by listSongs (§5.4). Uses
// foundation tokens on the warm surface. §7.2: brand-primary (#e83528) appears only as a decorative
// border/icon — never as small body text (fails AA at this size). Card text uses high-contrast
// tokens. §3.9: every badge pairs color with text + an icon, so meaning is never carried by color
// alone.
//
// §5.7: the card takes only resolved license-badge LABELS, never the raw per-type verified flags.
// When the display gate is OFF (MVP default) the page passes `licenseBadges: []`, so no license data
// reaches the client at all — not even in the RSC payload.
//
// 2b-2b-5: `href` (the locale-agnostic detail path, e.g. '/songs/bts-dynamite'; the i18n Link adds
// the locale) turns the card into a link to /songs/[slug]. It is `undefined` for a NULL-slug song
// (no canonical URL until migration Phase 2) → the card renders WITHOUT a link, still showing
// title/artist/badges. When a slug later fills in, the page passes href and the same card
// auto-activates as a link — no change here (the (a) decision). The branch is on slug presence only.

const CARD_BASE =
  'flex h-full flex-col gap-stack-md rounded-brand-card border border-transparent bg-white p-stack-lg shadow-[0_10px_30px_rgba(26,20,22,0.05)]';

export function SongCard({
  title,
  artist,
  beginnerCuration,
  beginnerLabel,
  licenseBadges,
  href,
}: {
  title: string;
  artist: string;
  beginnerCuration: boolean;
  beginnerLabel: string;
  licenseBadges: string[];
  href?: string;
}) {
  const content = (
    <>
      <div className="flex flex-col gap-stack-sm">
        <h3 className="font-headline text-2xl leading-tight text-surface-cinematic">{title}</h3>
        <p className="font-sans text-body-md text-muted-text">{artist}</p>
      </div>

      {(beginnerCuration || licenseBadges.length > 0) && (
        <div className="flex flex-wrap gap-stack-sm">
          {beginnerCuration && (
            <span className="inline-flex items-center gap-stack-sm rounded-full border border-brand-primary px-3 py-1 font-label-sm text-label-sm uppercase tracking-widest text-surface-cinematic">
              <Sparkles className="size-3.5 text-brand-primary" aria-hidden="true" />
              {beginnerLabel}
            </span>
          )}
          {licenseBadges.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-stack-sm rounded-full border border-success/40 px-3 py-1 font-label-sm text-label-sm uppercase tracking-widest text-surface-cinematic"
            >
              <BadgeCheck className="size-3.5 text-success" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      )}
    </>
  );

  return (
    <li className="h-full">
      {href ? (
        // Interactive card: hover/focus → brand-primary border + soft lift (DESIGN.md §Cards focus
        // state). The transparent border in CARD_BASE reserves space so there is no hover layout
        // shift. focus-visible ring keeps keyboard focus clearly visible (§6.4 WCAG AA).
        <Link
          href={href}
          className={cn(
            CARD_BASE,
            'transition duration-200 hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-[0_16px_40px_rgba(26,20,22,0.10)] focus-visible:border-brand-primary focus-visible:shadow-[0_16px_40px_rgba(26,20,22,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40',
          )}
        >
          {content}
        </Link>
      ) : (
        // NULL-slug song: a plain, non-interactive card (no link, no hover affordance) — reads as a
        // normal info card, not a broken link.
        <div className={CARD_BASE}>{content}</div>
      )}
    </li>
  );
}
